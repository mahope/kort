"use client";

import { useMapStore } from "@/stores/mapStore";
import { useUiStore } from "@/stores/uiStore";
import { flyToPrintArea } from "@/lib/map/focusPrintArea";
import { isFrameTooSmallToSee, usePrintFrameAreaShare } from "@/lib/map/printFrameVisibility";

/**
 * Appears once the print frame has shrunk to a speck under the dimming
 * mask, so it is always findable again with one tap — fits the map back
 * to it instead of making the user hunt for it or zoom in by hand.
 */
export function ZoomToPrintAreaButton() {
  const longitude = useMapStore((s) => s.viewState.longitude);
  const latitude = useMapStore((s) => s.viewState.latitude);
  const sheetPosition = useUiStore((s) => s.sheetPosition);
  const areaShare = usePrintFrameAreaShare();

  if (areaShare === null || !isFrameTooSmallToSee(areaShare)) return null;

  return (
    <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2">
      <button
        type="button"
        onClick={() => flyToPrintArea(longitude, latitude, sheetPosition)}
        className="flex items-center gap-1.5 rounded-lg bg-surface/90 px-3 py-2 pointer-coarse:min-h-11 text-sm font-medium text-foreground shadow-md backdrop-blur-sm hover:bg-surface transition-colors"
      >
        <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="4 3" />
          <path strokeLinecap="round" d="M9 15l6-6M9 9h6v6" />
        </svg>
        Zoom til printområde
      </button>
    </div>
  );
}
