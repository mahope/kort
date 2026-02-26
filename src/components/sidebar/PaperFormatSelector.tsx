"use client";

import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { usePrintStore } from "@/stores/printStore";
import { PAPER_FORMAT_OPTIONS } from "@/constants/paperFormats";
import type { PaperFormat, Orientation } from "@/types/print";

export function PaperFormatSelector() {
  const paperFormat = usePrintStore((s) => s.paperFormat);
  const orientation = usePrintStore((s) => s.orientation);
  const setPaperFormat = usePrintStore((s) => s.setPaperFormat);
  const setOrientation = usePrintStore((s) => s.setOrientation);

  return (
    <div className="space-y-3">
      <Select
        label="Papirformat"
        value={paperFormat}
        options={PAPER_FORMAT_OPTIONS.map((f) => ({
          value: f.value,
          label: f.label,
        }))}
        onChange={(v) => setPaperFormat(v as PaperFormat)}
      />
      <Toggle
        label="Orientering"
        value={orientation}
        options={[
          { value: "portrait", label: "Staende" },
          { value: "landscape", label: "Liggende" },
        ]}
        onChange={(v) => setOrientation(v as Orientation)}
      />
    </div>
  );
}
