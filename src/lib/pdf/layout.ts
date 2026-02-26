import type { PaperFormat, Orientation, PdfLayout } from "@/types/print";
import { PAPER_FORMATS, DEFAULT_MARGIN_MM } from "@/constants/paperFormats";

export function mmToPt(mm: number): number {
  return (mm / 25.4) * 72;
}

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export function calculatePdfLayout(
  format: PaperFormat,
  orientation: Orientation,
  dpi = 300
): PdfLayout {
  const dims = PAPER_FORMATS[format];
  let pageWidthMm = dims.widthMm;
  let pageHeightMm = dims.heightMm;

  if (orientation === "landscape") {
    [pageWidthMm, pageHeightMm] = [pageHeightMm, pageWidthMm];
  }

  const marginMm = DEFAULT_MARGIN_MM;
  const mapWidthMm = pageWidthMm - 2 * marginMm;
  const mapHeightMm = pageHeightMm - 2 * marginMm;

  return {
    pageWidthMm,
    pageHeightMm,
    marginMm,
    mapWidthMm,
    mapHeightMm,
    canvasWidth: mmToPx(mapWidthMm, dpi),
    canvasHeight: mmToPx(mapHeightMm, dpi),
  };
}
