import * as maplibregl from "maplibre-gl";
import type { PrintFrameBounds } from "@/types/print";
import type { MapStyle, BaseLayer, OverlayState } from "@/types/map";
import { configureMaplibreWorker } from "@/lib/map/workerUrl";
import type { ImportedLayer } from "@/stores/importStore";
import type { DrawnFeature } from "@/stores/drawStore";
import { MAP_STYLES, transformRequest } from "@/lib/map/styles";
import { BLANK_STYLE, ORTOFOTO_SOURCE, OSM_SOURCE, DTK25_SOURCE, HISTORISK_HOEJE_SOURCE, HISTORISK_LAVE_SOURCE, OVERLAY_SOURCES } from "@/lib/map/sources";
import type { RasterSourceConfig } from "@/lib/map/sources";
import { getMaxCanvasSize, canvasLimitMessage } from "./limits";
import { timed } from "./timing";

// JPEG quality for the rendered map image embedded in the PDF.
export const MAP_JPEG_QUALITY = 0.92;

// Failed tiles are retried this many times, with a growing pause, before the
// render is aborted.
export const TILE_RETRIES = 2;
export const TILE_RETRY_PAUSE_MS = 1000;

const OFFLINE_MESSAGE = "Du er offline: kortet kan ikke hentes";

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

type TileEvent = { sourceId?: string; dataType?: string; tile?: { tileID?: { key?: number | string } } };

/** Tracks tiles that errored and have not (yet) loaded successfully. */
function trackFailedTiles(map: maplibregl.Map) {
  const failed = new Map<string, FailedTile>();
  let anonymous = 0;
  map.on("error", (e) => {
    const ev = e as unknown as TileEvent;
    if (!ev.tile || !ev.sourceId) return; // style/glyph errors are not tile errors
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

// MapLibre has no public retry for errored tiles, and TileManager.reload()
// deliberately skips them. Re-request each failed tile as "expired", which
// makes both raster and vector sources fetch it from scratch.
function retryTiles(map: maplibregl.Map, tiles: Iterable<FailedTile>) {
  type Manager = { _reloadTile?: (id: number | string, state: string) => unknown };
  const managers = (map as unknown as { style?: { tileManagers?: Record<string, Manager> } }).style?.tileManagers;
  for (const { sourceId, tileKey } of tiles) {
    if (tileKey !== undefined) managers?.[sourceId]?._reloadTile?.(tileKey, "expired");
  }
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
  showUtmGrid?: boolean;
  scale?: number;
  bearing?: number;
}

export async function renderMapToImage({
  bounds,
  canvasWidth,
  canvasHeight,
  style,
  baseLayer,
  overlays,
  importedLayers = [],
  drawnFeatures = [],
  showUtmGrid = false,
  scale = 25000,
  bearing = 0,
}: RenderOptions): Promise<string> {
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

    const RASTER_BASE_LAYERS: Record<string, RasterSourceConfig> = {
      ortofoto: ORTOFOTO_SOURCE,
      dtk25: DTK25_SOURCE,
      osm: OSM_SOURCE,
      historisk_hoeje: HISTORISK_HOEJE_SOURCE,
      historisk_lave: HISTORISK_LAVE_SOURCE,
    };

    const centerLng = (bounds.west + bounds.east) / 2;
    const centerLat = (bounds.north + bounds.south) / 2;

    const mapOptions: maplibregl.MapOptions = {
      container,
      style: mapStyle,
      transformRequest,
      interactive: false,
      attributionControl: false,
      pixelRatio: 1,
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
    const failedTiles = trackFailedTiles(map);

    await waitForMapLoad(map);

    // Add raster base layer if not skaermkort
    const rasterSource = RASTER_BASE_LAYERS[baseLayer];
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
      map.addSource(sourceId, {
        type: "raster",
        tiles: sourceConfig.tiles,
        tileSize: sourceConfig.tileSize,
      });
      map.addLayer({
        id: `${sourceId}-layer`,
        type: "raster",
        source: sourceId,
        paint: { "raster-opacity": overlay.opacity },
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
        retryTiles(tileMap, failedTiles.values());
        await waitForTilesLoaded(tileMap);
      }
    });
    if (failedTiles.size > 0) {
      throw new Error(isOffline() ? OFFLINE_MESSAGE : missingTilesMessage(failedTiles.size));
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
    // valid) before cleanup — avoids cloning the full-resolution canvas a second
    // time, which roughly halves peak memory for large formats.
    return await timed("encode", () => canvas.toDataURL("image/jpeg", MAP_JPEG_QUALITY));
  } finally {
    // Always release the WebGL context, even if load/tile waits time out —
    // otherwise repeated failures exhaust the browser's ~16 context limit.
    map?.remove();
    document.body.removeChild(container);
  }
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
