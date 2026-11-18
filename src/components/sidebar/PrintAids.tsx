"use client";

import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";

export function PrintAids() {
  const hasBasemap = useMapStore((s) => s.baseLayer !== "none");
  const showScaleBar = usePrintStore((s) => s.showScaleBar) ?? hasBasemap;
  const showNorthArrow = usePrintStore((s) => s.showNorthArrow) ?? hasBasemap;
  const setShowScaleBar = usePrintStore((s) => s.setShowScaleBar);
  const setShowNorthArrow = usePrintStore((s) => s.setShowNorthArrow);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer pointer-coarse:min-h-11">
        <input
          type="checkbox"
          checked={showScaleBar}
          onChange={(e) => setShowScaleBar(e.target.checked)}
          className="accent-primary pointer-coarse:h-5 pointer-coarse:w-5"
        />
        <span className="text-sm">Målestokslineal i printet</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer pointer-coarse:min-h-11">
        <input
          type="checkbox"
          checked={showNorthArrow}
          onChange={(e) => setShowNorthArrow(e.target.checked)}
          className="accent-primary pointer-coarse:h-5 pointer-coarse:w-5"
        />
        <span className="text-sm">Nordpil i printet</span>
      </label>
    </div>
  );
}
