"use client";

import { usePrintStore } from "@/stores/printStore";
import { useMapStore } from "@/stores/mapStore";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { calculatePdfLayout } from "@/lib/pdf/layout";
import { assembledSizeCm } from "@/lib/pdf/assembly";

const COUNTS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));

export function MultiPageSelector() {
  const multiPage = usePrintStore((s) => s.multiPage);
  const setMultiPage = usePrintStore((s) => s.setMultiPage);
  const gridCols = usePrintStore((s) => s.gridCols);
  const gridRows = usePrintStore((s) => s.gridRows);
  const setGridCols = usePrintStore((s) => s.setGridCols);
  const setGridRows = usePrintStore((s) => s.setGridRows);
  const overlapMm = usePrintStore((s) => s.overlapMm);
  const setOverlapMm = usePrintStore((s) => s.setOverlapMm);
  const paperFormat = usePrintStore((s) => s.paperFormat);
  const rotated = useMapStore((s) => Math.abs(s.viewState.bearing) > 0.5);
  const orientation = usePrintStore((s) => s.orientation);

  const totalPages = gridCols * gridRows;
  const size = assembledSizeCm(calculatePdfLayout(paperFormat, orientation), gridCols, gridRows, overlapMm);

  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer pointer-coarse:min-h-11">
        <input
          type="checkbox"
          checked={multiPage}
          onChange={(e) => setMultiPage(e.target.checked)}
          className="accent-primary pointer-coarse:h-5 pointer-coarse:w-5"
        />
        <span className="text-sm font-medium">Flersidet udskrift (gulvkort)</span>
      </label>

      {multiPage && (
        <div className="mt-2 space-y-3" data-testid="multipage-settings">
          <ChipGroup label="Ark på tværs" value={String(gridCols)} options={COUNTS} columns={5} onChange={(v) => setGridCols(Number(v))} />
          <ChipGroup label="Ark på langs" value={String(gridRows)} options={COUNTS} columns={5} onChange={(v) => setGridRows(Number(v))} />
          <div>
            <label htmlFor="multipage-overlap" className="mb-1 flex justify-between text-sm font-medium">
              Overlap <span className="font-normal text-text-secondary tabular-nums">{overlapMm} mm</span>
            </label>
            <input
              id="multipage-overlap"
              type="range"
              min={0}
              max={20}
              step={1}
              value={overlapMm}
              onChange={(e) => setOverlapMm(Number(e.target.value))}
              className="w-full accent-primary pointer-coarse:h-11"
            />
          </div>
          {rotated && (
            <p className="text-xs text-danger" role="note">
              Kortet er drejet. Sæt rotationen til 0°, ellers passer arkene ikke sammen.
            </p>
          )}
          <p className="text-xs text-text-secondary" data-testid="multipage-summary">
            {totalPages} ark i {paperFormat} ({gridCols} × {gridRows}). Samlet kort ca.{" "}
            <span className="font-medium text-foreground tabular-nums">
              {Math.round(size.widthCm)} × {Math.round(size.heightCm)} cm
            </span>
            {totalPages > 1 && ". PDF'en starter med en oversigtsside, og hvert ark har hjørnemærker og viser, hvor naboarket skal ligge."}
          </p>
        </div>
      )}
    </div>
  );
}
