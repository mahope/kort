"use client";

import { Select } from "@/components/ui/Select";
import { usePrintStore } from "@/stores/printStore";
import type { DpiOption } from "@/types/print";

const DPI_OPTIONS: { value: string; label: string }[] = [
  { value: "150", label: "150 DPI (hurtig)" },
  { value: "200", label: "200 DPI" },
  { value: "300", label: "300 DPI (høj kvalitet)" },
];

export function DpiSelector() {
  const dpi = usePrintStore((s) => s.dpi);
  const setDpi = usePrintStore((s) => s.setDpi);

  return (
    <Select
      label="Opløsning"
      value={String(dpi)}
      options={DPI_OPTIONS}
      onChange={(v) => setDpi(Number(v) as DpiOption)}
    />
  );
}
