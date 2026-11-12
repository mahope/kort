import type { jsPDF } from "jspdf";
import type { PdfLayout } from "@/types/print";

/**
 * Marks that let a multi-page print be cut and laid together into one big
 * map (e.g. a floor map of 3 x 3 or 4 x 4 sheets): crop marks at the map
 * corners, a dashed line where the next sheet's edge goes, the neighbouring
 * sheet's label in the margin, and an overview page with the sheet grid.
 */

export interface SheetPosition {
  row: number;
  col: number;
}

export interface Neighbours {
  top: string | null;
  bottom: string | null;
  left: string | null;
  right: string | null;
}

/** Sheet label as used on the pages: row letter + column number (A1, A2, B1 ...). */
export function sheetLabel(row: number, col: number): string {
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

export function sheetNeighbours({ row, col }: SheetPosition, cols: number, rows: number): Neighbours {
  return {
    top: row > 0 ? sheetLabel(row - 1, col) : null,
    bottom: row < rows - 1 ? sheetLabel(row + 1, col) : null,
    left: col > 0 ? sheetLabel(row, col - 1) : null,
    right: col < cols - 1 ? sheetLabel(row, col + 1) : null,
  };
}

/** Size in cm of the assembled map: sheets trimmed to the map edge, overlaps laid on top. */
export function assembledSizeCm(
  layout: Pick<PdfLayout, "mapWidthMm" | "mapHeightMm">,
  cols: number,
  rows: number,
  overlapMm: number
): { widthCm: number; heightCm: number } {
  return {
    widthCm: (cols * layout.mapWidthMm - (cols - 1) * overlapMm) / 10,
    heightCm: (rows * layout.mapHeightMm - (rows - 1) * overlapMm) / 10,
  };
}

const CROP_GAP_MM = 1;
const CROP_LEN_MM = 4;

/** Crop marks in the margin at the four corners of the map image. */
export function drawCropMarks(pdf: jsPDF, layout: Pick<PdfLayout, "marginMm" | "mapWidthMm" | "mapHeightMm">): void {
  const x1 = layout.marginMm;
  const y1 = layout.marginMm;
  const x2 = x1 + layout.mapWidthMm;
  const y2 = y1 + layout.mapHeightMm;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.2);
  for (const [x, dx] of [[x1, -1], [x2, 1]] as const) {
    for (const [y, dy] of [[y1, -1], [y2, 1]] as const) {
      pdf.line(x + dx * CROP_GAP_MM, y, x + dx * (CROP_GAP_MM + CROP_LEN_MM), y);
      pdf.line(x, y + dy * CROP_GAP_MM, x, y + dy * (CROP_GAP_MM + CROP_LEN_MM));
    }
  }
}

const LABEL_PT = 7;
/** Below this overlap the hint goes in the margin instead of the overlap strip. */
const MIN_STRIP_MM = 5;

/**
 * Where the next sheet goes: a dashed line where its edge lands, and
 * "Læg ark A2 her" in the strip it will cover (so the hint is hidden once the
 * map is assembled). Only right and bottom neighbours are marked; each pair of
 * sheets is then marked once, and the overview page shows the whole grid.
 * Nothing is written in the margin where the UTM grid puts its labels, unless
 * the overlap is too small for the strip.
 */
export function drawAssemblyMarks(
  pdf: jsPDF,
  layout: Pick<PdfLayout, "marginMm" | "mapWidthMm" | "mapHeightMm" | "pageWidthMm" | "pageHeightMm">,
  neighbours: Neighbours,
  overlapMm: number
): void {
  const x1 = layout.marginMm;
  const y1 = layout.marginMm;
  const x2 = x1 + layout.mapWidthMm;
  const y2 = y1 + layout.mapHeightMm;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  if (overlapMm > 0) {
    pdf.setLineWidth(0.25);
    pdf.setDrawColor(0);
    pdf.setLineDashPattern([2, 1.5], 0);
    if (neighbours.right) pdf.line(x2 - overlapMm, y1, x2 - overlapMm, y2);
    if (neighbours.bottom) pdf.line(x1, y2 - overlapMm, x2, y2 - overlapMm);
    pdf.setLineDashPattern([], 0);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(LABEL_PT);
  pdf.setTextColor(0);
  const inStrip = overlapMm >= MIN_STRIP_MM;
  const textH = LABEL_PT * (25.4 / 72);
  if (neighbours.right) {
    const t = `Læg ark ${neighbours.right} her`;
    const w = pdf.getTextWidth(t);
    // Rotated -90 reads top to bottom; the baseline sits left of the glyphs.
    const x = inStrip ? x2 - overlapMm / 2 - textH / 2 : x2 + 2;
    if (inStrip) whiteBox(pdf, x - 0.8, cy - w / 2 - 1, textH + 1.6, w + 2);
    pdf.text(t, x, cy - w / 2, { angle: -90 });
  }
  if (neighbours.bottom) {
    const t = `Læg ark ${neighbours.bottom} her`;
    const w = pdf.getTextWidth(t);
    const y = inStrip ? y2 - overlapMm / 2 + textH / 2 : y2 + 3.5;
    if (inStrip) whiteBox(pdf, cx - w / 2 - 1, y - textH - 0.4, w + 2, textH + 1.4);
    pdf.text(t, cx, y, { align: "center" });
  }
  pdf.setFont("helvetica", "normal");
}

function whiteBox(pdf: jsPDF, x: number, y: number, w: number, h: number): void {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, w, h, "F");
}

export interface OverviewPlacement {
  /** Map image position and size on the overview page (mm). */
  x: number;
  y: number;
  w: number;
  h: number;
}

const OVERVIEW_TITLE_MM = 9;
const OVERVIEW_TEXT_MM = 34;

/**
 * Fit the whole printed area (groundW x groundH metres, aspect only) into the
 * overview page, below the title and above the assembly instructions.
 */
export function overviewPlacement(
  layout: Pick<PdfLayout, "marginMm" | "mapWidthMm" | "mapHeightMm">,
  groundW: number,
  groundH: number
): OverviewPlacement {
  const boxW = layout.mapWidthMm;
  const boxH = layout.mapHeightMm - OVERVIEW_TITLE_MM - OVERVIEW_TEXT_MM;
  const s = Math.min(boxW / groundW, boxH / groundH);
  const w = groundW * s;
  const h = groundH * s;
  return {
    x: layout.marginMm + (boxW - w) / 2,
    y: layout.marginMm + OVERVIEW_TITLE_MM + (boxH - h) / 2,
    w,
    h,
  };
}

/** Sheet rectangles on the overview image, in mm on the page. */
export function overviewCells(
  place: OverviewPlacement,
  cols: number,
  rows: number,
  pageGroundW: number,
  pageGroundH: number,
  overlapM: number
): { label: string; x: number; y: number; w: number; h: number }[] {
  const totalW = pageGroundW + (cols - 1) * (pageGroundW - overlapM);
  const totalH = pageGroundH + (rows - 1) * (pageGroundH - overlapM);
  const kx = place.w / totalW;
  const ky = place.h / totalH;
  const out = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      out.push({
        label: sheetLabel(row, col),
        x: place.x + col * (pageGroundW - overlapM) * kx,
        y: place.y + row * (pageGroundH - overlapM) * ky,
        w: pageGroundW * kx,
        h: pageGroundH * ky,
      });
    }
  }
  return out;
}

export interface OverviewText {
  cols: number;
  rows: number;
  paper: string;
  scale: number;
  overlapMm: number;
  assembled: { widthCm: number; heightCm: number };
}

/** Draws title, sheet grid and instructions; the map image is added by the caller. */
export function drawOverview(
  pdf: jsPDF,
  layout: Pick<PdfLayout, "marginMm" | "mapWidthMm" | "mapHeightMm">,
  place: OverviewPlacement,
  cells: ReturnType<typeof overviewCells>,
  t: OverviewText
): void {
  const m = layout.marginMm;
  pdf.setTextColor(0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(`Oversigt: ${t.cols * t.rows} ark (${t.cols} × ${t.rows}) i ${t.paper}`, m, m + 5);

  pdf.setDrawColor(200, 0, 0);
  pdf.setLineWidth(0.4);
  const labelPt = Math.max(8, Math.min(28, (Math.min(cells[0].w, cells[0].h) / 3) * 2.83));
  for (const c of cells) {
    pdf.rect(c.x, c.y, c.w, c.h);
  }
  pdf.setFontSize(labelPt);
  pdf.setTextColor(200, 0, 0);
  for (const c of cells) {
    pdf.text(c.label, c.x + c.w / 2, c.y + c.h / 2, { align: "center", baseline: "middle" });
  }

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0);
  pdf.setFontSize(9);
  const size = `${formatCm(t.assembled.widthCm)} × ${formatCm(t.assembled.heightCm)} cm`;
  const lines = [
    `Samlet kort: ca. ${size} i 1:${t.scale.toLocaleString("da-DK")}.`,
    "Udskriv i 100 % / faktisk størrelse. Klip kun venstre og øverste kant af hvert ark af, langs hjørnemærkerne.",
    t.overlapMm > 0
      ? `Arkene overlapper ${t.overlapMm} mm: læg den klippede kant på den stiplede linje, hvor der står "Læg ark ... her".`
      : "Arkene overlapper ikke: læg den klippede kant kant i kant med naboarket.",
    "Rækkerne hedder A, B, C ... oppefra, og kolonnerne 1, 2, 3 ... fra venstre.",
  ];
  let y = place.y + place.h + 7;
  for (const line of lines) {
    const wrapped = pdf.splitTextToSize(line, layout.mapWidthMm) as string[];
    pdf.text(wrapped, m, y);
    y += wrapped.length * 4.2;
  }
}

function formatCm(cm: number): string {
  return Math.round(cm).toLocaleString("da-DK");
}
