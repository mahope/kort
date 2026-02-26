import type { PaperFormat, Orientation } from "@/types/print";

export interface PaperFormatDimensions {
  widthMm: number;
  heightMm: number;
}

export const PAPER_FORMATS: Record<PaperFormat, PaperFormatDimensions> = {
  A5: { widthMm: 148, heightMm: 210 },
  A4: { widthMm: 210, heightMm: 297 },
  A3: { widthMm: 297, heightMm: 420 },
  A2: { widthMm: 420, heightMm: 594 },
};

export const PAPER_FORMAT_OPTIONS: { value: PaperFormat; label: string }[] = [
  { value: "A5", label: "A5 (148 x 210 mm)" },
  { value: "A4", label: "A4 (210 x 297 mm)" },
  { value: "A3", label: "A3 (297 x 420 mm)" },
  { value: "A2", label: "A2 (420 x 594 mm)" },
];

export const DEFAULT_PAPER_FORMAT: PaperFormat = "A4";
export const DEFAULT_ORIENTATION: Orientation = "portrait";
export const DEFAULT_MARGIN_MM = 10;
