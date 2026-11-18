"use client";

import { usePrintStore } from "@/stores/printStore";
import { useMapStore } from "@/stores/mapStore";
import { useUiStore } from "@/stores/uiStore";
import { BASE_LAYERS } from "@/constants/baseLayers";
import { isSheetLayout } from "@/lib/ui/sheet";

/**
 * One discreet line above the "Download PDF" button — the only part of the
 * sheet that stays visible when it is minimized on mobile, which otherwise
 * showed nothing about what is about to be printed. Tapping it opens the
 * settings above it (they are the sheet's own first section, so "opening"
 * just means expanding/scrolling to them).
 */
export function PrintSummaryLine() {
  const paperFormat = usePrintStore((s) => s.paperFormat);
  const scale = usePrintStore((s) => s.scale);
  const baseLayer = useMapStore((s) => s.baseLayer);
  const setSheetPosition = useUiStore((s) => s.setSheetPosition);
  const layerLabel = BASE_LAYERS.find((l) => l.value === baseLayer)?.label ?? baseLayer;

  const openSettings = () => {
    if (isSheetLayout()) setSheetPosition("mid");
    document.querySelector("[data-sheet-scroll]")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={openSettings}
      className="mb-2 block w-full truncate text-left text-xs text-text-secondary hover:text-foreground py-0.5"
    >
      {paperFormat} &middot; 1:{scale.toLocaleString("da-DK")} &middot; {layerLabel}
    </button>
  );
}
