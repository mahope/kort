import type { ScalePreset } from "@/types/print";

export const SCALE_PRESETS: { value: ScalePreset; label: string }[] = [
  { value: 10000, label: "1:10.000" },
  { value: 25000, label: "1:25.000" },
  { value: 50000, label: "1:50.000" },
  { value: 100000, label: "1:100.000" },
  { value: 250000, label: "1:250.000" },
  { value: 500000, label: "1:500.000" },
];

export const DEFAULT_SCALE: ScalePreset = 25000;
