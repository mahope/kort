import type { SheetPosition } from "@/stores/uiStore";

// Heights live in CSS (globals.css: --sheet-min/mid/max) so the first server
// render already has the final layout; these mirror them for JS.
export const SNAP_MIN_PX = 108;
export const SNAP_MID_FRAC = 0.4;
export const SNAP_MAX_FRAC = 0.6;

/** True when the settings are a bottom sheet (below md), not a sidebar. */
export function isSheetLayout(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && !window.matchMedia("(min-width: 768px)").matches;
}

/** Height in px the sheet covers at a snap position (0 when it is a sidebar). */
export function sheetHeightPx(position: SheetPosition, viewportHeight: number): number {
  if (position === "min") return SNAP_MIN_PX;
  return Math.round(viewportHeight * (position === "mid" ? SNAP_MID_FRAC : SNAP_MAX_FRAC));
}
