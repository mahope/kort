"use client";

import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { useUiStore } from "@/stores/uiStore";
import { metersPerPixel } from "@/lib/geo/utmGrid";
import { useMapViewportSize } from "@/lib/hooks/useMapViewportSize";
import { printGroundSize, rotatedExtent } from "./focusPrintArea";

/**
 * Share (0-1, by area) that a ground area of widthM x heightM covers of a
 * viewportW x viewportH px viewport, at the given metres-per-pixel. Pure, so
 * the "frame is hard to see" threshold below can be unit tested without a
 * map instance.
 */
export function frameAreaShare(
  widthM: number,
  heightM: number,
  viewportW: number,
  viewportH: number,
  metersPerPx: number
): number {
  if (viewportW <= 0 || viewportH <= 0 || metersPerPx <= 0) return 0;
  const frameAreaPx = (widthM / metersPerPx) * (heightM / metersPerPx);
  const viewportAreaPx = viewportW * viewportH;
  if (viewportAreaPx <= 0) return 0;
  return frameAreaPx / viewportAreaPx;
}

/** Below this share of the viewport, the print frame is hard to spot. */
export const SMALL_FRAME_AREA_SHARE = 0.1;

/** True once the frame covers less than `threshold` of the viewport's area. */
export function isFrameTooSmallToSee(areaShare: number, threshold = SMALL_FRAME_AREA_SHARE): boolean {
  return areaShare < threshold;
}

/**
 * Dimming-mask opacity for a given area share: `full` once the frame is
 * comfortably visible, fading smoothly to 0 as it shrinks further below the
 * "too small to see" threshold, instead of a hard cutoff.
 */
export function maskOpacityForAreaShare(
  areaShare: number,
  { full = 0.3, threshold = SMALL_FRAME_AREA_SHARE }: { full?: number; threshold?: number } = {}
): number {
  if (areaShare >= threshold || threshold <= 0) return full;
  return full * Math.max(0, areaShare / threshold);
}

/**
 * Live area share of the print frame within the visible map (the part not
 * covered by the mobile sheet). Null until the viewport has been measured.
 */
export function usePrintFrameAreaShare(): number | null {
  const zoom = useMapStore((s) => s.viewState.zoom);
  const latitude = useMapStore((s) => s.viewState.latitude);
  const bearing = useMapStore((s) => s.viewState.bearing);
  const sheetPx = useUiStore((s) => s.sheetPx);
  const viewport = useMapViewportSize();
  // Fingerprint of the print settings that change the frame's ground size:
  // re-render on a real change, then read the fresh values via
  // printGroundSize() below instead of duplicating its calculation here.
  usePrintStore(
    (s) => `${s.paperFormat}|${s.orientation}|${s.scale}|${s.multiPage}|${s.gridCols}|${s.gridRows}|${s.overlapMm}`
  );

  if (!viewport) return null;
  const ground = printGroundSize();
  const { widthM, heightM } = rotatedExtent(ground.widthM, ground.heightM, bearing);
  const mpp = metersPerPixel(latitude, zoom);
  const viewportHeight = Math.max(0, viewport.height - sheetPx);
  return frameAreaShare(widthM, heightM, viewport.width, viewportHeight, mpp);
}
