"use client";

import { ChipGroup } from "@/components/ui/ChipGroup";
import { Toggle } from "@/components/ui/Toggle";
import { usePrintStore } from "@/stores/printStore";
import { PAPER_FORMAT_OPTIONS, LARGE_FORMATS, LARGE_FORMAT_MAX_DPI } from "@/constants/paperFormats";
import type { PaperFormat, Orientation } from "@/types/print";

export function PaperFormatSelector() {
  const paperFormat = usePrintStore((s) => s.paperFormat);
  const orientation = usePrintStore((s) => s.orientation);
  const setPaperFormat = usePrintStore((s) => s.setPaperFormat);
  const setOrientation = usePrintStore((s) => s.setOrientation);

  return (
    <div className="space-y-3">
      <ChipGroup
        label="Papirformat"
        value={paperFormat}
        options={PAPER_FORMAT_OPTIONS.map((f) => ({
          value: f.value,
          label: f.value,
          ariaLabel: f.label,
        }))}
        onChange={(v) => setPaperFormat(v as PaperFormat)}
        columns={3}
      />
      {LARGE_FORMATS.includes(paperFormat) && (
        <p className="text-xs text-text-secondary" role="note">
          {paperFormat} er ét stort ark til et trykkeri eller en plotter. Det laves med op til {LARGE_FORMAT_MAX_DPI} dpi, som er rigeligt til et kort, man står og kigger på. Kan enheden ikke klare det, bliver opløsningen lidt lavere.
        </p>
      )}
      <Toggle
        label="Orientering"
        value={orientation}
        options={[
          { value: "portrait", label: "Stående" },
          { value: "landscape", label: "Liggende" },
        ]}
        onChange={(v) => setOrientation(v as Orientation)}
      />
    </div>
  );
}
