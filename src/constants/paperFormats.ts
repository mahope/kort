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
  A1: { widthMm: 594, heightMm: 841 },
  A0: { widthMm: 841, heightMm: 1189 },
};

export const PAPER_FORMAT_OPTIONS: { value: PaperFormat; label: string }[] = [
  { value: "A5", label: "A5 (148 x 210 mm)" },
  { value: "A4", label: "A4 (210 x 297 mm)" },
  { value: "A3", label: "A3 (297 x 420 mm)" },
  { value: "A2", label: "A2 (420 x 594 mm)" },
  { value: "A1", label: "A1 (594 x 841 mm)" },
  { value: "A0", label: "A0 (841 x 1189 mm)" },
];

/** Print-shop formats: one large sheet, rendered at most at LARGE_FORMAT_MAX_DPI. */
export const LARGE_FORMATS: readonly PaperFormat[] = ["A1", "A0"];
/** 150 dpi is plenty for a sheet looked at from standing height, and keeps
 *  the A0 canvas (about 5000 x 7000 px) within what most GPUs can render. */
export const LARGE_FORMAT_MAX_DPI = 150;

/** DPI actually used for a format: large formats are capped. */
export function printDpi(format: PaperFormat, dpi: number): number {
  return LARGE_FORMATS.includes(format) ? Math.min(dpi, LARGE_FORMAT_MAX_DPI) : dpi;
}

export const DEFAULT_PAPER_FORMAT: PaperFormat = "A4";
export const DEFAULT_ORIENTATION: Orientation = "portrait";
export const DEFAULT_MARGIN_MM = 10;
