import { calculatePrintArea } from "@/lib/geo/calculations";
import { zoomToFitGround } from "@/lib/geo/fitZoom";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { useUiStore, type SheetPosition } from "@/stores/uiStore";
import { isSheetLayout, sheetHeightPx } from "@/lib/ui/sheet";

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

/** Axis-aligned extent of a w x h frame turned by `bearing` degrees. */
export function rotatedExtent(widthM: number, heightM: number, bearing: number): { widthM: number; heightM: number } {
  const r = (bearing * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return { widthM: widthM * c + heightM * s, heightM: widthM * s + heightM * c };
}

/**
 * Fly to a place so the whole print frame is visible in the part of the map
 * that the mobile sheet does not cover. `sheetPosition` is where the sheet is
 * going (it may still be animating), so zoom and padding match the end state.
 */
export function flyToPrintArea(lng: number, lat: number, sheetPosition?: SheetPosition): void {
  const main = typeof document !== "undefined" ? document.querySelector("main") : null;
  const rect = main?.getBoundingClientRect();
  const width = rect?.width ?? 800;
  const fullHeight = rect?.height ?? 600;
  const sheetPx =
    sheetPosition && isSheetLayout() ? sheetHeightPx(sheetPosition, window.innerHeight) : useUiStore.getState().sheetPx;
  const { viewState } = useMapStore.getState();
  const ground = printGroundSize();
  const { widthM, heightM } = rotatedExtent(ground.widthM, ground.heightM, viewState.bearing);
  const zoom = zoomToFitGround(widthM, heightM, width, fullHeight - sheetPx, lat);
  useMapStore.getState().flyTo(lng, lat, zoom, { top: 0, left: 0, right: 0, bottom: sheetPx });
}
