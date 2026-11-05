import type { jsPDF } from "jspdf";
import type { PdfLayout } from "@/types/print";

/** Length of the calibration line on paper. Measuring it shows whether the print dialog rescaled the page. */
export const CONTROL_LINE_MM = 100;
export const CONTROL_LINE_TEXT = "Mål linjen: den skal være 10,0 cm. Udskriv i 100 % / faktisk størrelse.";

const TEXT_PT = 6;
const PAD_MM = 2;
const TICK_MM = 1.5;
// The box sits in the bottom-left of the map, above the scale bar (which
// reaches 9.3 mm above the map's bottom edge and at most 45 mm from its left edge).
const LEFT_OFFSET_MM = 5;
const BOTTOM_OFFSET_MM = 11;
const BOX_HEIGHT_MM = 9;

export interface ControlLineGeometry {
  box: { x: number; y: number; w: number; h: number };
  line: { x1: number; x2: number; y: number };
  ticks: { y1: number; y2: number };
  text: { x: number; y: number };
}

/** Pure placement of the control line; `textWidthMm` is the width of CONTROL_LINE_TEXT at 6 pt. */
export function controlLineGeometry(
  layout: Pick<PdfLayout, "marginMm" | "mapHeightMm">,
  textWidthMm: number
): ControlLineGeometry {
  const x = layout.marginMm + LEFT_OFFSET_MM;
  const bottom = layout.marginMm + layout.mapHeightMm - BOTTOM_OFFSET_MM;
  const top = bottom - BOX_HEIGHT_MM;
  const lineY = top + 6.5;
  const lineX1 = x + PAD_MM;
  return {
    box: { x, y: top, w: Math.max(CONTROL_LINE_MM, textWidthMm) + 2 * PAD_MM, h: BOX_HEIGHT_MM },
    line: { x1: lineX1, x2: lineX1 + CONTROL_LINE_MM, y: lineY },
    ticks: { y1: lineY - TICK_MM, y2: lineY + TICK_MM },
    text: { x: lineX1, y: top + 3.5 },
  };
}

export function drawControlLine(pdf: jsPDF, layout: Pick<PdfLayout, "marginMm" | "mapHeightMm">): void {
  pdf.setFontSize(TEXT_PT);
  pdf.setFont("helvetica", "normal");
  const g = controlLineGeometry(layout, pdf.getTextWidth(CONTROL_LINE_TEXT));

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.15);
  pdf.rect(g.box.x, g.box.y, g.box.w, g.box.h, "FD");

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.3);
  pdf.line(g.line.x1, g.line.y, g.line.x2, g.line.y);
  pdf.line(g.line.x1, g.ticks.y1, g.line.x1, g.ticks.y2);
  pdf.line(g.line.x2, g.ticks.y1, g.line.x2, g.ticks.y2);

  pdf.setTextColor(0);
  pdf.text(CONTROL_LINE_TEXT, g.text.x, g.text.y);
}

/** Ask viewers to print at 100 % instead of "fit to page" (PrintScaling /None). */
export function applyPrintPreferences(pdf: jsPDF): void {
  pdf.viewerPreferences({ PrintScaling: "None" });
}
