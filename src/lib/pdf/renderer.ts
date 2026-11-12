import * as maplibregl from "maplibre-gl";
import type { PrintFrameBounds } from "@/types/print";
import type { MapStyle, BaseLayer, OverlayState } from "@/types/map";
import { configureMaplibreWorker } from "@/lib/map/workerUrl";
import type { ImportedLayer } from "@/stores/importStore";
import type { DrawnFeature } from "@/stores/drawStore";
import { MAP_STYLES, transformRequest } from "@/lib/map/styles";
import { BLANK_STYLE, getRasterBaseLayers, OVERLAY_SOURCES } from "@/lib/map/sources";
import { getMaxCanvasSize, canvasLimitMessage } from "./limits";
import { contourLayers, contourSourceUrl, ensurePmtilesProtocol, SCREEN_PX_PER_MM } from "@/lib/map/contours";
import { timed } from "./timing";

const PRINT_RASTER_BASE_LAYERS = getRasterBaseLayers("print");

// JPEG quality for the rendered map image embedded in the PDF.
const MAP_JPEG_QUALITY = 0.92;

// Failed tiles are retried this many times, with a growing pause, before the
// render is aborted.
export const TILE_RETRIES = 2;
const TILE_RETRY_PAUSE_MS = 1000;

// PDFs are rendered at print resolution from DTK25's print tiles, which the
// offline area cache (screen tiles at zoom 12-16) does not hold. Offline PDF is
// deliberately unsupported; the message says so instead of failing on tiles.
const OFFLINE_MESSAGE =
  "Du er offline: PDF kræver internet, også for gemte områder. Gemte områder virker kun i kortvisningen";

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function missingTilesMessage(count: number): string {
  const tiles = count === 1 ? "1 kortflise mangler" : `${count} kortfliser mangler`;
  return `${tiles}, så PDF'en ville have huller i kortet. Prøv igen.`;
}

interface FailedTile {
  sourceId: string;
  tileKey: number | string | undefined;
}

/** Called whenever the number of requested or loaded map tiles changes. */
type TileProgress = (loaded: number, total: number) => void;

type TileEvent = { sourceId?: string; dataType?: string; tile?: { tileID?: { key?: number | string } } };

/** Tracks tiles that errored and have not (yet) loaded successfully. */
function trackFailedTiles(map: maplibregl.Map, failedSources: Set<string>) {
  const failed = new Map<string, FailedTile>();
  let anonymous = 0;
  map.on("error", (e) => {
    const ev = e as unknown as TileEvent;
    if (!ev.sourceId) return; // style/glyph errors are not tile errors
    // A source error without a tile: the source itself (e.g. the contour archive's
    // header) could not load. MapLibre then marks it loaded with no tiles, so the
    // tile wait would pass and the PDF would silently miss the layer.
    if (!ev.tile) {
      failedSources.add(ev.sourceId);
      return;
    }
    const tileKey = ev.tile.tileID?.key;
    failed.set(`${ev.sourceId}/${tileKey ?? `anon${anonymous++}`}`, { sourceId: ev.sourceId, tileKey });
  });
  map.on("data", (e) => {
    const ev = e as unknown as TileEvent;
    if (ev.dataType === "source" && ev.tile && ev.sourceId) {
      failed.delete(`${ev.sourceId}/${ev.tile.tileID?.key}`);
    }
  });
  return failed;
}

/** Counts distinct tiles that started loading and those that arrived, to drive the progress display. */
function trackTileProgress(map: maplibregl.Map, onProgress: TileProgress) {
  const requested = new Set<string>();
  const loaded = new Set<string>();
  const key = (ev: TileEvent) => `${ev.sourceId}/${ev.tile?.tileID?.key}`;
  map.on("dataloading", (e) => {
    const ev = e as unknown as TileEvent;
    if (ev.dataType !== "source" || !ev.tile || !ev.sourceId) return;
    requested.add(key(ev));
    onProgress(loaded.size, requested.size);
  });
  map.on("data", (e) => {
    const ev = e as unknown as TileEvent;
    if (ev.dataType !== "source" || !ev.tile || !ev.sourceId) return;
    const k = key(ev);
    requested.add(k);
    loaded.add(k);
    onProgress(loaded.size, requested.size);
  });
}

// MapLibre has no public retry for errored tiles, and TileManager.reload()
// deliberately skips them. Drop each failed tile from its TileManager and let
// update() request it again like any new tile. Reloading it in place does not
// work for raster tiles (#66): as "expired" it counts as having data and was
// drawn without a texture ("reading 'bind'"); as "loading" MapLibre dropped
// some of them before they arrived, and the PDF was refused as incomplete.
type Manager = { _removeTile?: (id: number | string) => void };

type Internals = { _update?: () => void; redraw?: () => void; style?: { tileManagers?: Record<string, Manager> } };

function retryTiles(map: maplibregl.Map, failed: Map<string, FailedTile>) {
  const internals = map as unknown as Internals;
  // Without _update a removed tile would never be requested again: leave the
  // failures counted so the PDF is refused loudly instead of having a hole.
  if (typeof internals._update !== "function") return;
  const managers = internals.style?.tileManagers;
  let removed = 0;
  for (const [key, { sourceId, tileKey }] of [...failed]) {
    const manager = managers?.[sourceId];
    if (tileKey === undefined || !manager?._removeTile) continue;
    manager._removeTile(tileKey);
    // Forget it: if the map still needs the tile it is requested again and an
    // error puts it back. Helper tiles (parents, edge buffer) are not, and must
    // not count as holes in the PDF.
    failed.delete(key);
    removed++;
  }
  if (removed === 0) return;
  // Marks the sources dirty, then renders synchronously so update() requests
  // the missing tiles now; waiting for the next frame left a window (and in a
  // hidden tab no frame at all) in which areTilesLoaded() saw nothing missing.
  internals._update();
  internals.redraw?.();
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getDashArray(lineStyle: string): number[] | undefined {
  switch (lineStyle) {
    case "dashed": return [4, 3];
    case "dotted": return [1, 2];
    default: return undefined;
  }
}

interface RenderOptions {
  bounds: PrintFrameBounds;
  canvasWidth: number;
  canvasHeight: number;
  style: MapStyle;
  baseLayer: BaseLayer;
  overlays: OverlayState[];
  importedLayers?: ImportedLayer[];
  drawnFeatures?: DrawnFeature[];
  bearing?: number;
  /** Canvas pixels per millimetre on paper, for vector line widths (contours). */
  pxPerMm?: number;
  onTileProgress?: TileProgress;
}

/** Renders the map at target resolution and returns it as JPEG bytes. */
export async function renderMapToImage({
  bounds,
  canvasWidth,
  canvasHeight,
  style,
  baseLayer,
  overlays,
  importedLayers = [],
  drawnFeatures = [],
  bearing = 0,
  pxPerMm = SCREEN_PX_PER_MM,
  onTileProgress,
}: RenderOptions): Promise<Uint8Array> {
  if (isOffline()) throw new Error(OFFLINE_MESSAGE);

  const maxSize = getMaxCanvasSize();
  if (Math.max(canvasWidth, canvasHeight) > maxSize) {
    throw new Error(canvasLimitMessage(canvasWidth, canvasHeight, maxSize));
  }

  // Create hidden container at target resolution
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = `${canvasWidth}px`;
  container.style.height = `${canvasHeight}px`;
  document.body.appendChild(container);

  let map: maplibregl.Map | undefined;
  try {
    const mapStyle = baseLayer === "skaermkort" ? MAP_STYLES[style].url : BLANK_STYLE;

    const centerLng = (bounds.west + bounds.east) / 2;
    const centerLat = (bounds.north + bounds.south) / 2;

    const mapOptions: maplibregl.MapOptions = {
      container,
      style: mapStyle,
      transformRequest,
      interactive: false,
      attributionControl: false,
      pixelRatio: 1,
      // MapLibre's own default (4096 px) silently scales a larger canvas down,
      // which made A2 at 300 dpi and A1/A0 fail. Allow what the GPU can do.
      maxCanvasSize: [maxSize, maxSize],
      canvasContextAttributes: { preserveDrawingBuffer: true },
    };

    if (bearing !== 0) {
      // With bearing, use center/zoom instead of bounds
      // MapLibre uses 512 px tiles: ground resolution = (cos(lat) * 40075016.686) / (512 * 2^zoom)
      // We need: canvasWidth px = groundWidth m, so zoom = log2(cos(lat) * 40075016.686 * canvasWidth / (512 * groundWidth))
      const groundWidthM = bounds.east - bounds.west;
      const latRad = (centerLat * Math.PI) / 180;
      const metersPerDegreeLng = 111320 * Math.cos(latRad);
      const groundWidthMeters = groundWidthM * metersPerDegreeLng;
      const groundResolution = groundWidthMeters / canvasWidth; // meters per pixel
      const zoom = Math.log2((Math.cos(latRad) * 40075016.686) / (512 * groundResolution));

      mapOptions.center = [centerLng, centerLat];
      mapOptions.zoom = zoom;
      mapOptions.bearing = bearing;
    } else {
      mapOptions.bounds = [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ];
      mapOptions.fitBoundsOptions = { padding: 0 };
    }

    configureMaplibreWorker();
    map = new maplibregl.Map(mapOptions);
    const failedSources = new Set<string>();
    const failedTiles = trackFailedTiles(map, failedSources);
    if (onTileProgress) trackTileProgress(map, onTileProgress);

    await waitForMapLoad(map);

    // Add raster base layer if not skaermkort
    const rasterSource = PRINT_RASTER_BASE_LAYERS[baseLayer];
    if (rasterSource) {
      map.addSource(`base-${baseLayer}`, {
        type: "raster",
        tiles: rasterSource.tiles,
        tileSize: rasterSource.tileSize,
      });
      map.addLayer({ id: `base-${baseLayer}-layer`, type: "raster", source: `base-${baseLayer}` });
    }

    // Add active overlays
    const activeOverlays = overlays.filter((o) => o.enabled);
    for (const overlay of activeOverlays) {
      const sourceConfig = OVERLAY_SOURCES[overlay.id];
      const sourceId = `${overlay.id}-overlay`;
      if (sourceConfig.contourInterval) {
        ensurePmtilesProtocol();
        map.addSource(sourceId, { type: "vector", url: contourSourceUrl() });
        for (const layer of contourLayers(sourceId, sourceConfig.contourInterval, overlay.opacity, pxPerMm)) map.addLayer(layer);
        continue;
      }
      map.addSource(sourceId, {
        type: "raster",
        tiles: sourceConfig.tiles,
        tileSize: sourceConfig.tileSize,
      });
      map.addLayer({
        id: `${sourceId}-layer`,
        type: "raster",
        source: sourceId,
        paint: { "raster-opacity": overlay.opacity, ...sourceConfig.paint },
      });
    }

    // Add imported layers
    for (const layer of importedLayers.filter((l) => l.visible)) {
      const sourceId = `pdf-import-${layer.id}`;
      map.addSource(sourceId, { type: "geojson", data: layer.geojson });
      map.addLayer({
        id: `${sourceId}-fill`,
        type: "fill",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": layer.style.fillColor,
          "fill-opacity": layer.style.fillOpacity,
        },
      });
      const dash = getDashArray(layer.style.lineStyle);
      map.addLayer({
        id: `${sourceId}-line`,
        type: "line",
        source: sourceId,
        filter: ["any", ["==", ["geometry-type"], "LineString"], ["==", ["geometry-type"], "Polygon"]],
        paint: {
          "line-color": layer.style.lineColor,
          "line-width": layer.style.lineWidth,
          ...(dash ? { "line-dasharray": dash } : {}),
        },
      });
      map.addLayer({
        id: `${sourceId}-point`,
        type: "circle",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": layer.style.fillColor,
          "circle-radius": layer.style.lineWidth + 2,
          "circle-stroke-color": layer.style.lineColor,
          "circle-stroke-width": 2,
        },
      });
    }

    // Add drawn features — one source+layer set per feature to preserve individual styles
    for (let i = 0; i < drawnFeatures.length; i++) {
      const f = drawnFeatures[i];
      const ds = f.style;
      const sourceId = `pdf-drawn-${i}`;
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [f.geojson] },
      });
      map.addLayer({
        id: `${sourceId}-fill`,
        type: "fill",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": ds.fillColor, "fill-opacity": ds.fillOpacity },
      });
      map.addLayer({
        id: `${sourceId}-line`,
        type: "line",
        source: sourceId,
        filter: ["any", ["==", ["geometry-type"], "LineString"], ["==", ["geometry-type"], "Polygon"]],
        paint: { "line-color": ds.lineColor, "line-width": ds.lineWidth },
      });
      map.addLayer({
        id: `${sourceId}-point`,
        type: "circle",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": ds.fillColor,
          "circle-radius": ds.lineWidth + 2,
          "circle-stroke-color": ds.lineColor,
          "circle-stroke-width": 2,
        },
      });
    }

    // UTM grid is drawn as vector lines in the PDF generator (drawUtmGrid),
    // not baked into the raster image, for crisp output at any zoom level.

    // Wait for all tiles (including raster overlays) to load
    const tileMap = map;
    await timed("tiles", async () => {
      await waitForTilesLoaded(tileMap);
      for (let attempt = 1; failedTiles.size > 0 && attempt <= TILE_RETRIES; attempt++) {
        if (isOffline()) break;
        await sleep(TILE_RETRY_PAUSE_MS * attempt);
        retryTiles(tileMap, failedTiles);
        await waitForTilesLoaded(tileMap);
      }
    });
    if (failedTiles.size > 0) {
      throw new Error(isOffline() ? OFFLINE_MESSAGE : missingTilesMessage(failedTiles.size));
    }
    if (failedSources.size > 0) {
      throw new Error(isOffline() ? OFFLINE_MESSAGE : "Et kortlag kunne ikke hentes, så PDF'en ville mangle det. Prøv igen.");
    }

    // WebGL silently clamps oversized canvases; never deliver a downscaled map.
    const canvas = map.getCanvas();
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      throw new Error(
        `Kortbilledet blev ${canvas.width} x ${canvas.height} px i stedet for ${canvasWidth} x ${canvasHeight} px. ` +
          canvasLimitMessage(canvasWidth, canvasHeight, Math.min(maxSize, Math.max(canvas.width, canvas.height)))
      );
    }

    // Encode straight from the map's own canvas (preserveDrawingBuffer keeps it
    // valid) before cleanup. toBlob encodes off the main thread, unlike
    // toDataURL, which blocked the page for the whole encode.
    await timed("gpu", () => waitForGpu(canvas));
    return await timed("encode", () => encodeJpeg(canvas));
  } finally {
    // Always release the WebGL context, even if load/tile waits time out —
    // otherwise repeated failures exhaust the browser's ~16 context limit.
    map?.remove();
    document.body.removeChild(container);
  }
}

// Reading pixels back while the GPU still has the render queued blocks the main
// thread until it is done (seconds with software WebGL). Fence the queue and poll
// instead, so the page stays responsive and the readback that follows is quick.
const GPU_WAIT_TIMEOUT_MS = 60000;
const GPU_POLL_MS = 20;

async function waitForGpu(canvas: HTMLCanvasElement): Promise<void> {
  if (typeof canvas.getContext !== "function") return;
  const gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null; // returns the map's own context
  const sync = gl?.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!gl || !sync) return;
  gl.flush();
  try {
    // Hidden tabs throttle timers to ~1 s, so polling would stretch the render.
    // Nobody sees a frozen page there, so let the readback block instead.
    if (typeof document !== "undefined" && document.hidden) return;
    const deadline = performance.now() + GPU_WAIT_TIMEOUT_MS;
    while (performance.now() < deadline) {
      const status = gl.clientWaitSync(sync, 0, 0);
      if (status !== gl.TIMEOUT_EXPIRED) return;
      if (document.hidden) return;
      await sleep(GPU_POLL_MS);
    }
  } finally {
    gl.deleteSync(sync);
  }
}

async function encodeJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await canvasToJpegBlob(canvas);
  if (!blob) throw new Error("Kortbilledet kunne ikke gemmes som JPEG. Prøv igen med lavere opløsning.");
  return new Uint8Array(await blob.arrayBuffer());
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", MAP_JPEG_QUALITY));
}

function waitForMapLoad(map: maplibregl.Map): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Kort-rendering timeout (60s)"));
    }, 60000);

    map.once("load", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function waitForTilesLoaded(map: maplibregl.Map): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error("Tile-loading timeout (60s)"));
    }, 60000);

    const checkInterval = setInterval(() => {
      if (map.isStyleLoaded() && map.areTilesLoaded()) {
        clearInterval(checkInterval);
        // Extra delay for final render
        setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, 500);
      }
    }, 100);
  });
}
