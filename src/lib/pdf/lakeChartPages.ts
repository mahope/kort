import type { jsPDF } from "jspdf";
import type { Orientation, PdfLayout, PrintFrameBounds } from "@/types/print";
import {
  chartsInBounds,
  lakeChartDetails,
  lakeChartImageUrl,
  loadLakeCharts,
  type LakeChart,
} from "@/lib/map/lakeCharts";
import { NAVIGATION_WARNING } from "@/lib/map/sources";

export const LAKE_CHART_NOTE =
  "Historisk kort, gengivet uændret fra Geodatastyrelsens skanning og formindsket til arket. Dybderne er målt for mange år siden og kan have ændret sig.";
export const LAKE_CHART_CREDIT =
  "Kilde: Geodatastyrelsen, Historiske indsøkort (historiskekort.dk), CC BY 4.0.";

/** Scan resolution: about 200 dpi across the page, which is plenty for a scanned chart. */
function scanWidthPx(pageWidthMm: number): number {
  return Math.min(2400, Math.round((pageWidthMm / 25.4) * 200));
}

interface ChartImage {
  chart: LakeChart;
  data: Uint8Array;
}

async function fetchScan(chart: LakeChart, widthPx: number): Promise<ChartImage | null> {
  try {
    const res = await fetch(lakeChartImageUrl(chart, widthPx));
    if (!res.ok) return null;
    return { chart, data: new Uint8Array(await res.arrayBuffer()) };
  } catch {
    return null;
  }
}

/** One page: heading, warning, the scan fitted below, and the credit at the foot. */
export function drawLakeChartPage(
  pdf: jsPDF,
  layout: Pick<PdfLayout, "pageWidthMm" | "pageHeightMm" | "marginMm">,
  { chart, data }: ChartImage
): void {
  const m = layout.marginMm;
  const w = layout.pageWidthMm - 2 * m;
  let y = m + 4;

  pdf.setTextColor(0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  // Titles run up to ~90 characters, so heading and details wrap to the page width.
  const heading = pdf.splitTextToSize(`Bilag: historisk indsøkort over ${chart.title}`, w) as string[];
  pdf.text(heading, m, y);
  y += heading.length * 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  const details = lakeChartDetails(chart);
  if (details) {
    const lines = pdf.splitTextToSize(
      `${details}${chart.scale ? " (målestok på originalen, ikke på dette ark)" : ""}`,
      w
    ) as string[];
    pdf.text(lines, m, y);
    y += lines.length * 3.4 + 0.6;
  }

  // The warning in a box of its own, so it cannot be missed or cut off.
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  const warnH = 6;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.4);
  pdf.rect(m, y, w, warnH);
  pdf.text(NAVIGATION_WARNING, m + 2, y + 4.2);
  y += warnH + 2;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  const note = pdf.splitTextToSize(LAKE_CHART_NOTE, w) as string[];
  pdf.text(note, m, y + 2.5);
  y += note.length * 3.1 + 2;

  const footY = layout.pageHeightMm - m;
  const maxH = footY - 4 - y;
  const props = pdf.getImageProperties(data);
  const scale = Math.min(w / props.width, maxH / props.height);
  const iw = props.width * scale;
  const ih = props.height * scale;
  pdf.addImage(data, "JPEG", m + (w - iw) / 2, y, iw, ih);

  pdf.setFontSize(6);
  pdf.setTextColor(100);
  pdf.text(LAKE_CHART_CREDIT, m, footY);
  pdf.setTextColor(0);
}

/**
 * Adds a page per historical lake chart inside the printed area (at most
 * MAX_CHARTS_PER_PDF). A chart that cannot be fetched is left out rather than
 * failing the map; the count of added pages is returned.
 */
export async function addLakeChartPages(
  pdf: jsPDF,
  layout: PdfLayout,
  orientation: Orientation,
  bounds: PrintFrameBounds
): Promise<number> {
  let charts: LakeChart[];
  try {
    charts = chartsInBounds(await loadLakeCharts(), bounds);
  } catch {
    return 0;
  }
  const images = (await Promise.all(charts.map((c) => fetchScan(c, scanWidthPx(layout.pageWidthMm))))).filter(
    (x): x is ChartImage => x !== null
  );
  for (const img of images) {
    pdf.addPage([layout.pageWidthMm, layout.pageHeightMm], orientation === "landscape" ? "landscape" : "portrait");
    drawLakeChartPage(pdf, layout, img);
  }
  return images.length;
}
