import maplibregl from "maplibre-gl";
import type { PrintFrameBounds } from "@/types/print";
import type { MapStyle, BaseLayer, OverlayState } from "@/types/map";
import { MAP_STYLES, transformRequest } from "@/lib/map/styles";
import { BLANK_STYLE, ORTOFOTO_SOURCE, OSM_SOURCE, OVERLAY_SOURCES } from "@/lib/map/sources";

interface RenderOptions {
  bounds: PrintFrameBounds;
  canvasWidth: number;
  canvasHeight: number;
  style: MapStyle;
  baseLayer: BaseLayer;
  overlays: OverlayState[];
}

export async function renderMapToCanvas({
  bounds,
  canvasWidth,
  canvasHeight,
  style,
  baseLayer,
  overlays,
}: RenderOptions): Promise<HTMLCanvasElement> {
  // Create hidden container at target resolution
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = `${canvasWidth}px`;
  container.style.height = `${canvasHeight}px`;
  document.body.appendChild(container);

  try {
    const mapStyle = baseLayer === "skaermkort" ? MAP_STYLES[style].url : BLANK_STYLE;

    const map = new maplibregl.Map({
      container,
      style: mapStyle,
      transformRequest,
      bounds: [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ],
      fitBoundsOptions: { padding: 0 },
      interactive: false,
      attributionControl: false,
      pixelRatio: 1,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    await waitForMapLoad(map);

    // Add raster base layer if not skaermkort
    if (baseLayer === "ortofoto") {
      map.addSource("ortofoto", {
        type: "raster",
        tiles: ORTOFOTO_SOURCE.tiles,
        tileSize: ORTOFOTO_SOURCE.tileSize,
      });
      map.addLayer({ id: "ortofoto-layer", type: "raster", source: "ortofoto" });
    } else if (baseLayer === "osm") {
      map.addSource("osm", {
        type: "raster",
        tiles: OSM_SOURCE.tiles,
        tileSize: OSM_SOURCE.tileSize,
      });
      map.addLayer({ id: "osm-layer", type: "raster", source: "osm" });
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

    // Wait for all tiles (including raster overlays) to load
    await waitForTilesLoaded(map);

    const canvas = map.getCanvas();

    // Clone canvas data before cleanup
    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    const ctx = resultCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(canvas, 0, 0);
    }

    map.remove();
    return resultCanvas;
  } finally {
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
