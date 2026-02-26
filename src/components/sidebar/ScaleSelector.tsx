"use client";

import { Select } from "@/components/ui/Select";
import { usePrintStore } from "@/stores/printStore";
import { SCALE_PRESETS } from "@/constants/scales";
import type { ScalePreset } from "@/types/print";

export function ScaleSelector() {
  const scale = usePrintStore((s) => s.scale);
  const setScale = usePrintStore((s) => s.setScale);

  return (
    <Select
      label="Målestok"
      value={String(scale)}
      options={SCALE_PRESETS.map((s) => ({
        value: String(s.value),
        label: s.label,
      }))}
      onChange={(v) => setScale(Number(v) as ScalePreset)}
    />
  );
}
