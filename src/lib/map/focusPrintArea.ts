import { calculatePrintArea } from "@/lib/geo/calculations";
import { zoomToFitGround } from "@/lib/geo/fitZoom";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { useUiStore } from "@/stores/uiStore";

/** Ground size in metres of what will be printed (all pages when multi-page). */
export function printGroundSize(): { widthM: number; heightM: number } {
  const p = usePrintStore.getState();
  const area = calculatePrintArea(p.paperFormat, p.orientation, p.scale);
  if (!p.multiPage) return { widthM: area.groundWidthM, heightM: area.groundHeightM };
  const overlapM = (p.overlapMm * p.scale) / 1000;
  return {
    widthM: p.gridCols * area.groundWidthM - (p.gridCols - 1) * overlapM,
    heightM: p.gridRows * area.groundHeightM - (p.gridRows - 1) * overlapM,
  };
}

/**
 * Fly to a place so the whole print frame is visible in the part of the map
 * that the mobile sheet does not cover (the map is padded by that height).
 */
export function flyToPrintArea(lng: number, lat: number): void {
  const main = typeof document !== "undefined" ? document.querySelector("main") : null;
  const rect = main?.getBoundingClientRect();
  const width = rect?.width ?? 800;
  const height = (rect?.height ?? 600) - useUiStore.getState().sheetPx;
  const { widthM, heightM } = printGroundSize();
  useMapStore.getState().flyTo(lng, lat, zoomToFitGround(widthM, heightM, width, height, lat));
}
