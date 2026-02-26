import { jsPDF } from "jspdf";
import type { PaperFormat, Orientation, DpiOption, PrintFrameBounds } from "@/types/print";
import type { MapStyle, BaseLayer, OverlayState } from "@/types/map";
import { useMapStore } from "@/stores/mapStore";
import { calculatePdfLayout } from "./layout";
import { renderMapToCanvas } from "./renderer";

interface GeneratePdfOptions {
  bounds: PrintFrameBounds;
  scale: number;
  paperFormat: PaperFormat;
  orientation: Orientation;
  dpi: DpiOption;
}

export async function generatePdf({
  bounds,
  scale,
  paperFormat,
  orientation,
  dpi,
}: GeneratePdfOptions): Promise<void> {
  const mapState = useMapStore.getState();
  const style: MapStyle = mapState.style;
  const baseLayer: BaseLayer = mapState.baseLayer;
  const overlays: OverlayState[] = mapState.overlays;
  const layout = calculatePdfLayout(paperFormat, orientation, dpi);

  // Render map at target resolution
  const canvas = await renderMapToCanvas({
    bounds,
    canvasWidth: layout.canvasWidth,
    canvasHeight: layout.canvasHeight,
    style,
    baseLayer,
    overlays,
  });

  // Create PDF
  const pdf = new jsPDF({
    orientation: orientation === "landscape" ? "landscape" : "portrait",
    unit: "mm",
    format: [layout.pageWidthMm, layout.pageHeightMm],
  });

  // Add map image
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(
    imgData,
    "JPEG",
    layout.marginMm,
    layout.marginMm,
    layout.mapWidthMm,
    layout.mapHeightMm
  );

  // Draw decorations
  drawScaleBar(pdf, layout, scale);
  drawNorthArrow(pdf, layout);
  drawAttribution(pdf, layout, scale);

  // Save
  const scaleStr = scale >= 1000 ? `${scale / 1000}k` : String(scale);
  pdf.save(`kort_1${scaleStr}_${paperFormat}.pdf`);
}

function drawScaleBar(
  pdf: jsPDF,
  layout: { marginMm: number; mapWidthMm: number; mapHeightMm: number; pageHeightMm: number },
  scale: number
) {
  // Calculate a "nice" distance for the scale bar
  const barWidthMm = 40; // target bar width on paper
  const barDistanceM = (barWidthMm * scale) / 1000; // ground distance

  // Find nearest "nice" number
  const nice = niceNumber(barDistanceM);
  const actualBarMm = (nice * 1000) / scale;

  const x = layout.marginMm + 5;
  const y = layout.marginMm + layout.mapHeightMm - 5;

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.5);
  pdf.setFillColor(0, 0, 0);

  // Bar line
  pdf.line(x, y, x + actualBarMm, y);
  // End ticks
  pdf.line(x, y - 1.5, x, y + 1.5);
  pdf.line(x + actualBarMm, y - 1.5, x + actualBarMm, y + 1.5);

  // Label
  pdf.setFontSize(7);
  pdf.setTextColor(0);
  const label = nice >= 1000 ? `${nice / 1000} km` : `${nice} m`;
  pdf.text(label, x + actualBarMm / 2, y - 2.5, { align: "center" });
}

function niceNumber(value: number): number {
  const niceValues = [
    1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000,
    50000, 100000,
  ];
  for (const n of niceValues) {
    if (n >= value * 0.4) return n;
  }
  return niceValues[niceValues.length - 1];
}

function drawNorthArrow(
  pdf: jsPDF,
  layout: { marginMm: number; mapWidthMm: number }
) {
  const cx = layout.marginMm + layout.mapWidthMm - 8;
  const cy = layout.marginMm + 12;
  const size = 4;

  pdf.setFillColor(0, 0, 0);
  // Triangle pointing up
  pdf.triangle(cx, cy - size, cx - size / 2, cy + size / 2, cx + size / 2, cy + size / 2, "F");

  // "N" label
  pdf.setFontSize(8);
  pdf.setTextColor(0);
  pdf.text("N", cx, cy - size - 1.5, { align: "center" });
}

function drawAttribution(
  pdf: jsPDF,
  layout: { marginMm: number; mapWidthMm: number; mapHeightMm: number; pageWidthMm: number; pageHeightMm: number },
  scale: number
) {
  pdf.setFontSize(6);
  pdf.setTextColor(100);

  const y = layout.pageHeightMm - 4;

  // Scale text on left
  const scaleText = `1:${scale.toLocaleString("da-DK")}`;
  pdf.text(scaleText, layout.marginMm, y);

  // Attribution on right
  const attribution = "Kortdata: Klimadatastyrelsen | kort.mahoje.dk";
  pdf.text(attribution, layout.pageWidthMm - layout.marginMm, y, {
    align: "right",
  });
}
