import maplibregl from "maplibre-gl";
import type { PrintFrameBounds } from "@/types/print";
import type { MapStyle } from "@/types/map";
import { MAP_STYLES, transformRequest } from "@/lib/map/styles";

interface RenderOptions {
  bounds: PrintFrameBounds;
  canvasWidth: number;
  canvasHeight: number;
  style: MapStyle;
}

export async function renderMapToCanvas({
  bounds,
  canvasWidth,
  canvasHeight,
  style,
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
    const map = new maplibregl.Map({
      container,
      style: MAP_STYLES[style].url,
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

    await waitForMapReady(map);

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

function waitForMapReady(map: maplibregl.Map): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Kort-rendering timeout (60s)"));
    }, 60000);

    map.once("load", () => {
      // Poll for tiles loaded
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
  });
}
