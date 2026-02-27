import { jsPDF } from "jspdf";
import type { PaperFormat, Orientation, DpiOption, PrintFrameBounds, PageCell } from "@/types/print";
import type { MapStyle, BaseLayer, OverlayState } from "@/types/map";
import type { PdfLayout } from "@/types/print";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { useImportStore } from "@/stores/importStore";
import { useDrawStore } from "@/stores/drawStore";
import { useHistoryStore } from "@/stores/historyStore";
import { calculatePdfLayout } from "./layout";
import { renderMapToCanvas } from "./renderer";
import { calculateMultiPageGrid } from "@/lib/geo/calculations";
import { latlngToUtm, utmToLatlng, getGridInterval } from "@/lib/geo/utm";

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
  const printState = usePrintStore.getState();

  // Delegate to multi-page if enabled
  if (printState.multiPage) {
    return generateMultiPagePdf({ bounds, scale, paperFormat, orientation, dpi });
  }

  const mapState = useMapStore.getState();
  const style: MapStyle = mapState.style;
  const baseLayer: BaseLayer = mapState.baseLayer;
  const overlays: OverlayState[] = mapState.overlays;
  const importedLayers = useImportStore.getState().layers;
  const drawnFeatures = useDrawStore.getState().features;
  const layout = calculatePdfLayout(paperFormat, orientation, dpi);

  const showUtmGrid = mapState.showUtmGrid;
  const bearing = mapState.viewState.bearing;

  // Render map at target resolution
  const canvas = await renderMapToCanvas({
    bounds,
    canvasWidth: layout.canvasWidth,
    canvasHeight: layout.canvasHeight,
    style,
    baseLayer,
    overlays,
    importedLayers,
    drawnFeatures,
    showUtmGrid,
    scale,
    bearing,
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

  // Draw UTM grid coordinate labels if enabled
  if (showUtmGrid) {
    drawUtmGrid(pdf, layout, bounds, scale);
  }

  // Draw decorations
  drawScaleBar(pdf, layout, scale);
  drawNorthArrow(pdf, layout, bearing);
  drawAttribution(pdf, layout, scale, showUtmGrid, bounds);

  // Download via blob to avoid page navigation
  const scaleStr = scale >= 1000 ? `${scale / 1000}k` : String(scale);
  const filename = `kort_1${scaleStr}_${paperFormat}.pdf`;
  // Record in print history
  useHistoryStore.getState().addEntry({
    lng: mapState.viewState.longitude,
    lat: mapState.viewState.latitude,
    zoom: mapState.viewState.zoom,
    scale,
    paperFormat,
    orientation,
    baseLayer,
  });

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  layout: { marginMm: number; mapWidthMm: number },
  bearing = 0
) {
  const cx = layout.marginMm + layout.mapWidthMm - 8;
  const cy = layout.marginMm + 12;
  const size = 4;

  // Rotate arrow by negative bearing (bearing is clockwise, we rotate the arrow)
  const angle = (-bearing * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Triangle points (relative to center, pointing up when bearing=0)
  const tip = { x: 0, y: -size };
  const left = { x: -size / 2, y: size / 2 };
  const right = { x: size / 2, y: size / 2 };

  // Rotate points
  const rotate = (p: { x: number; y: number }) => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  });

  const rTip = rotate(tip);
  const rLeft = rotate(left);
  const rRight = rotate(right);

  pdf.setFillColor(0, 0, 0);
  pdf.triangle(rTip.x, rTip.y, rLeft.x, rLeft.y, rRight.x, rRight.y, "F");

  // "N" label above the tip
  const labelOffset = { x: 0, y: -size - 1.5 };
  const rLabel = rotate(labelOffset);
  pdf.setFontSize(8);
  pdf.setTextColor(0);
  pdf.text("N", rLabel.x, rLabel.y, { align: "center" });
}

/**
 * Draw UTM grid lines and coordinate labels on the PDF.
 */
function drawUtmGrid(
  pdf: jsPDF,
  layout: PdfLayout,
  bounds: PrintFrameBounds,
  scale: number
) {
  const centerLng = (bounds.west + bounds.east) / 2;
  const zone = Math.floor((centerLng + 180) / 6) + 1;
  const interval = getGridInterval(scale);

  // Convert bounds corners to UTM
  const sw = latlngToUtm(bounds.south, bounds.west, zone);
  const ne = latlngToUtm(bounds.north, bounds.east, zone);

  // Round to grid interval
  const minE = Math.floor(sw.easting / interval) * interval;
  const maxE = Math.ceil(ne.easting / interval) * interval;
  const minN = Math.floor(sw.northing / interval) * interval;
  const maxN = Math.ceil(ne.northing / interval) * interval;

  // Map area in mm on the PDF
  const mapLeftMm = layout.marginMm;
  const mapTopMm = layout.marginMm;
  const mapWidthMm = layout.mapWidthMm;
  const mapHeightMm = layout.mapHeightMm;

  // Helper: convert lat/lng to mm position on the map
  const lngToMm = (lng: number) =>
    mapLeftMm + ((lng - bounds.west) / (bounds.east - bounds.west)) * mapWidthMm;
  const latToMm = (lat: number) =>
    mapTopMm + ((bounds.north - lat) / (bounds.north - bounds.south)) * mapHeightMm;

  // Precompute all grid line segments
  const verticalLines: { x: number; y: number }[][] = [];
  for (let e = minE; e <= maxE; e += interval) {
    const points: { x: number; y: number }[] = [];
    for (let n = minN; n <= maxN; n += interval / 4) {
      const ll = utmToLatlng(e, n, zone);
      points.push({ x: lngToMm(ll.lng), y: latToMm(ll.lat) });
    }
    verticalLines.push(points);
  }

  const horizontalLines: { x: number; y: number }[][] = [];
  for (let n = minN; n <= maxN; n += interval) {
    const points: { x: number; y: number }[] = [];
    for (let e = minE; e <= maxE; e += interval / 4) {
      const ll = utmToLatlng(e, n, zone);
      points.push({ x: lngToMm(ll.lng), y: latToMm(ll.lat) });
    }
    horizontalLines.push(points);
  }

  // Draw black grid lines directly on top of the map image
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);

  // Clip lines to map area manually by clamping coordinates
  const drawLinesClipped = (lines: { x: number; y: number }[][]) => {
    const xMin = mapLeftMm;
    const xMax = mapLeftMm + mapWidthMm;
    const yMin = mapTopMm;
    const yMax = mapTopMm + mapHeightMm;
    for (const points of lines) {
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        // Only draw segments where both points are within the map area
        if (a.x >= xMin && a.x <= xMax && b.x >= xMin && b.x <= xMax &&
            a.y >= yMin && a.y <= yMax && b.y >= yMin && b.y <= yMax) {
          pdf.line(a.x, a.y, b.x, b.y);
        }
      }
    }
  };

  drawLinesClipped(verticalLines);
  drawLinesClipped(horizontalLines);

  // Draw coordinate labels outside the map area
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);

  // Bottom edge: easting labels
  for (let e = minE; e <= maxE; e += interval) {
    const ll = utmToLatlng(e, (sw.northing + ne.northing) / 2, zone);
    const xMm = lngToMm(ll.lng);
    if (xMm >= mapLeftMm && xMm <= mapLeftMm + mapWidthMm) {
      const label = `${Math.round(e / 1000)}`;
      pdf.text(label, xMm, mapTopMm + mapHeightMm + 4, { align: "center" });
      // Top edge
      pdf.text(label, xMm, mapTopMm - 1.5, { align: "center" });
    }
  }

  // Left edge: northing labels
  for (let n = minN; n <= maxN; n += interval) {
    const ll = utmToLatlng((sw.easting + ne.easting) / 2, n, zone);
    const yMm = latToMm(ll.lat);
    if (yMm >= mapTopMm && yMm <= mapTopMm + mapHeightMm) {
      const label = `${Math.round(n / 1000)}`;
      pdf.text(label, mapLeftMm - 1.5, yMm + 0.5, { align: "right" });
      // Right edge
      pdf.text(label, mapLeftMm + mapWidthMm + 1.5, yMm + 0.5, { align: "left" });
    }
  }

  pdf.setFont("helvetica", "normal");
}

function drawAttribution(
  pdf: jsPDF,
  layout: { marginMm: number; mapWidthMm: number; mapHeightMm: number; pageWidthMm: number; pageHeightMm: number },
  scale: number,
  showUtmGrid: boolean,
  bounds: PrintFrameBounds
) {
  pdf.setFontSize(6);
  pdf.setTextColor(100);

  const y = layout.pageHeightMm - 4;

  // Scale text on left
  let scaleText = `1:${scale.toLocaleString("da-DK")}`;
  if (showUtmGrid) {
    const centerLng = (bounds.west + bounds.east) / 2;
    const zone = Math.floor((centerLng + 180) / 6) + 1;
    scaleText += ` | UTM zone ${zone}N (ETRS89)`;
  }
  pdf.text(scaleText, layout.marginMm, y);

  // Attribution on right
  const attribution = "Kortdata: Klimadatastyrelsen | kort.mahoje.dk";
  pdf.text(attribution, layout.pageWidthMm - layout.marginMm, y, {
    align: "right",
  });
}

async function generateMultiPagePdf({
  scale,
  paperFormat,
  orientation,
  dpi,
}: GeneratePdfOptions): Promise<void> {
  const mapState = useMapStore.getState();
  const printState = usePrintStore.getState();
  const style: MapStyle = mapState.style;
  const baseLayer: BaseLayer = mapState.baseLayer;
  const overlays: OverlayState[] = mapState.overlays;
  const importedLayers = useImportStore.getState().layers;
  const drawnFeatures = useDrawStore.getState().features;
  const showUtmGrid = mapState.showUtmGrid;
  const bearing = mapState.viewState.bearing;
  const layout = calculatePdfLayout(paperFormat, orientation, dpi);

  const { cells } = calculateMultiPageGrid(
    mapState.viewState.longitude,
    mapState.viewState.latitude,
    paperFormat,
    orientation,
    scale,
    printState.overlapMm,
    printState.gridCols,
    printState.gridRows
  );

  const totalPages = cells.length;
  printState.setTotalPages(totalPages);

  const pdf = new jsPDF({
    orientation: orientation === "landscape" ? "landscape" : "portrait",
    unit: "mm",
    format: [layout.pageWidthMm, layout.pageHeightMm],
  });

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    printState.setGeneratingPage(i + 1);

    if (i > 0) {
      pdf.addPage([layout.pageWidthMm, layout.pageHeightMm], orientation === "landscape" ? "landscape" : "portrait");
    }

    const canvas = await renderMapToCanvas({
      bounds: cell.bounds,
      canvasWidth: layout.canvasWidth,
      canvasHeight: layout.canvasHeight,
      style,
      baseLayer,
      overlays,
      importedLayers,
      drawnFeatures,
      showUtmGrid,
      scale,
      bearing,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(imgData, "JPEG", layout.marginMm, layout.marginMm, layout.mapWidthMm, layout.mapHeightMm);

    if (showUtmGrid) {
      drawUtmGrid(pdf, layout, cell.bounds, scale);
    }

    drawScaleBar(pdf, layout, scale);
    drawNorthArrow(pdf, layout, bearing);

    // Page label
    pdf.setFontSize(8);
    pdf.setTextColor(0);
    pdf.text(`Side ${cell.label}`, layout.marginMm, layout.marginMm - 2);

    drawAttribution(pdf, layout, scale, showUtmGrid, cell.bounds);
  }

  printState.setGeneratingPage(0);
  printState.setTotalPages(0);

  // Record in print history
  useHistoryStore.getState().addEntry({
    lng: mapState.viewState.longitude,
    lat: mapState.viewState.latitude,
    zoom: mapState.viewState.zoom,
    scale,
    paperFormat,
    orientation,
    baseLayer,
  });

  const scaleStr = scale >= 1000 ? `${scale / 1000}k` : String(scale);
  const filename = `kort_1${scaleStr}_${paperFormat}_${cells.length}sider.pdf`;
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
