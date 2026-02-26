"use client";

import { usePrintStore } from "@/stores/printStore";

export function MultiPageSelector() {
  const multiPage = usePrintStore((s) => s.multiPage);
  const setMultiPage = usePrintStore((s) => s.setMultiPage);
  const gridCols = usePrintStore((s) => s.gridCols);
  const gridRows = usePrintStore((s) => s.gridRows);
  const setGridCols = usePrintStore((s) => s.setGridCols);
  const setGridRows = usePrintStore((s) => s.setGridRows);
  const overlapMm = usePrintStore((s) => s.overlapMm);
  const setOverlapMm = usePrintStore((s) => s.setOverlapMm);

  const totalPages = gridCols * gridRows;

  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={multiPage}
          onChange={(e) => setMultiPage(e.target.checked)}
          className="accent-primary"
        />
        <span className="text-sm font-medium">Flersidet udskrift</span>
      </label>

      {multiPage && (
        <div className="mt-2 ml-6 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted w-16">Kolonner</label>
            <input
              type="number"
              min={1}
              max={5}
              value={gridCols}
              onChange={(e) => setGridCols(Math.max(1, Math.min(5, Number(e.target.value))))}
              className="w-14 rounded border border-border px-1 py-0.5 text-xs text-center bg-surface"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted w-16">Rækker</label>
            <input
              type="number"
              min={1}
              max={5}
              value={gridRows}
              onChange={(e) => setGridRows(Math.max(1, Math.min(5, Number(e.target.value))))}
              className="w-14 rounded border border-border px-1 py-0.5 text-xs text-center bg-surface"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted w-16">Overlap</label>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={overlapMm}
              onChange={(e) => setOverlapMm(Number(e.target.value))}
              className="flex-1 h-1 accent-primary"
            />
            <span className="text-xs text-text-secondary w-10 text-right">{overlapMm} mm</span>
          </div>
          <p className="text-[10px] text-text-muted">
            {totalPages} sider ({gridCols}&times;{gridRows})
          </p>
        </div>
      )}
    </div>
  );
}
