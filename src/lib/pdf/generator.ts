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
import { getBrand } from "@/config/brand";
import { renderMapToImage } from "./renderer";
import { calculateMultiPageGrid } from "@/lib/geo/calculations";
import { latlngToUtm } from "@/lib/geo/utm";
import {
  computeGridLines,
  dominantAxis,
  dropOverlapping,
  edgeCrossings,
  formatGridLabel,
  formatSpacing,
  labelStep,
  resolvePrintSpacing,
  resolveUtmZone,
  type EdgeSample,
  type FormattedLabel,
  type GridLabelFormat,
  type GridLineClass,
  type GridSpacing,
} from "@/lib/geo/utmGrid";
import { createPaperProjector, type PaperProjector } from "./gridProjection";

/** Build the download filename shared by single- and multi-page output. */
function buildFilename(
  scale: number,
  paperFormat: PaperFormat,
  pageCount?: number
): string {
  const scaleStr = scale >= 1000 ? `${scale / 1000}k` : String(scale);
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const pages = pageCount ? `_${pageCount}sider` : "";
  return `kort_1${scaleStr}_${paperFormat}${pages}_${timestamp}.pdf`;
}

/** Trigger a browser download of the generated PDF via an object URL. */
function downloadPdf(pdf: jsPDF, filename: string): void {
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so large-blob downloads are not interrupted.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

  // Render map at target resolution (returns a JPEG data URL)
  const imgData = await renderMapToImage({
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
  pdf.addImage(
    imgData,
    "JPEG",
    layout.marginMm,
    layout.marginMm,
    layout.mapWidthMm,
    layout.mapHeightMm
  );

  // Draw UTM grid lines + margin labels if enabled
  let gridInfo: GridInfo | null = null;
  if (showUtmGrid) {
    const opts = gridOptionsFromStore((bounds.west + bounds.east) / 2, (bounds.north + bounds.south) / 2, bearing);
    gridInfo = { zone: opts.zone, spacing: drawUtmGrid(pdf, layout, bounds, scale, opts) };
  }

  // Draw decorations
  drawScaleBar(pdf, layout, scale);
  drawNorthArrow(pdf, layout, bearing);
  drawAttribution(pdf, layout, scale, gridInfo);

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

  downloadPdf(pdf, buildFilename(scale, paperFormat));
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

interface GridOptions {
  spacing: GridSpacing;
  showLabels: boolean;
  labelFormat: GridLabelFormat;
  zone: number;
  bearing: number;
  /** Space (mm from the left map edge) kept free in the top margin, e.g. for "Side A1". */
  reserveTopLeftMm?: number;
}

function gridOptionsFromStore(zoneLng: number, zoneLat: number, bearing: number): GridOptions {
  const m = useMapStore.getState();
  return {
    spacing: m.gridSpacing,
    showLabels: m.showGridLabels,
    labelFormat: m.gridLabelFormat,
    zone: resolveUtmZone(zoneLng, zoneLat, m.utmZoneMode),
    bearing,
  };
}

// Line weights in mm — 10 km lines clearly heavier than the rest.
const GRID_LINE_MM: Record<GridLineClass, number> = { major: 0.55, medium: 0.3, minor: 0.22 };
const GRID_LINE_MINOR_SUBKM_MM = 0.12;
const LABEL_PT = 8;
const PREFIX_PT = 5.5;
const PT_TO_MM = 25.4 / 72;

/**
 * Draw UTM grid lines (with 10 km / 1 km hierarchy) and one coordinate label
 * per grid line in the white margin on all four sides.
 * Returns the spacing actually drawn (null if the grid was too dense).
 */
function drawUtmGrid(
  pdf: jsPDF,
  layout: PdfLayout,
  bounds: PrintFrameBounds,
  scale: number,
  opts: GridOptions
): number | null {
  const { spacing } = resolvePrintSpacing(opts.spacing, scale);
  if (!spacing) return null;
  const { zone } = opts;
  const proj = createPaperProjector(bounds, layout, opts.bearing);

  const left = layout.marginMm;
  const top = layout.marginMm;
  const right = left + layout.mapWidthMm;
  const bottom = top + layout.mapHeightMm;

  // With a bearing the rendered image covers more than `bounds` — take the
  // lng/lat box of the four page corners so the grid reaches every corner.
  const corners = [
    proj.fromMm(left, top),
    proj.fromMm(right, top),
    proj.fromMm(right, bottom),
    proj.fromMm(left, bottom),
  ];
  const cover = {
    west: Math.min(...corners.map((c) => c.lng)),
    east: Math.max(...corners.map((c) => c.lng)),
    south: Math.min(...corners.map((c) => c.lat)),
    north: Math.max(...corners.map((c) => c.lat)),
  };
  const lines = computeGridLines(cover, zone, spacing);

  // Clip lines to the map area so nothing spills into the label margin.
  pdf.saveGraphicsState();
  pdf.rect(left, top, layout.mapWidthMm, layout.mapHeightMm, null);
  pdf.clip();
  pdf.discardPath();
  // Light lines first so the heavy 10 km lines sit on top.
  const order: GridLineClass[] = ["minor", "medium", "major"];
  for (const cls of order) {
    const subKmMinor = cls === "minor" && spacing < 1000;
    pdf.setLineWidth(subKmMinor ? GRID_LINE_MINOR_SUBKM_MM : GRID_LINE_MM[cls]);
    if (subKmMinor) pdf.setDrawColor(70, 70, 70);
    else pdf.setDrawColor(0, 0, 0);
    for (const line of lines) {
      if (line.cls !== cls) continue;
      const pts = line.coords.map(([lng, lat]) => proj.toMm(lng, lat));
      for (let i = 0; i < pts.length - 1; i++) {
        pdf.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      }
    }
  }
  pdf.restoreGraphicsState();
  pdf.setDrawColor(0, 0, 0);

  if (opts.showLabels) {
    drawGridLabels(pdf, proj, { left, top, right, bottom }, layout.marginMm, spacing, scale, opts);
  }
  return spacing;
}

function drawGridLabels(
  pdf: jsPDF,
  proj: PaperProjector,
  rect: { left: number; top: number; right: number; bottom: number },
  marginMm: number,
  spacing: number,
  scale: number,
  opts: GridOptions
) {
  const mmPerMeter = 1000 / scale;
  const SAMPLES = 48;
  const sample = (from: [number, number], to: [number, number]): EdgeSample[] => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const out: EdgeSample[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const f = i / SAMPLES;
      const ll = proj.fromMm(from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f);
      const u = latlngToUtm(ll.lat, ll.lng, opts.zone);
      out.push({ t: f * len, e: u.easting, n: u.northing });
    }
    return out;
  };

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");

  const measure = (l: FormattedLabel, k: number) => {
    pdf.setFontSize(PREFIX_PT * k);
    const wp = l.prefix ? pdf.getTextWidth(l.prefix) : 0;
    pdf.setFontSize(LABEL_PT * k);
    return { wp, wm: pdf.getTextWidth(l.main) };
  };

  // Shrink the font if the widest possible northing label would not fit the side margin.
  const widest = formatGridLabel(spacing < 1000 ? 6999900 : 6999000, opts.labelFormat);
  const w1 = measure(widest, 1);
  const k = Math.min(1, (marginMm - 2) / (w1.wp + w1.wm));

  const drawLabel = (l: FormattedLabel, x: number, baseline: number, align: "center" | "left" | "right") => {
    const { wp, wm } = measure(l, k);
    const w = wp + wm;
    const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    if (l.prefix) {
      pdf.setFontSize(PREFIX_PT * k);
      pdf.text(l.prefix, x0, baseline - LABEL_PT * k * PT_TO_MM * 0.3);
    }
    pdf.setFontSize(LABEL_PT * k);
    pdf.text(l.main, x0 + wp, baseline);
  };

  const capMm = LABEL_PT * k * PT_TO_MM * 0.72;
  const hGap = (w1.wp + w1.wm) * k + 2; // labels side by side (top/bottom)
  const vGap = capMm + 2.5; // labels stacked (left/right)

  interface Edge {
    from: [number, number];
    to: [number, number];
    horizontal: boolean;
    place: (t: number, l: FormattedLabel) => void;
    reserveStart?: number;
  }
  const edges: Edge[] = [
    {
      from: [rect.left, rect.top],
      to: [rect.right, rect.top],
      horizontal: true,
      place: (t, l) => drawLabel(l, rect.left + t, rect.top - 1.5, "center"),
      reserveStart: opts.reserveTopLeftMm,
    },
    {
      from: [rect.left, rect.bottom],
      to: [rect.right, rect.bottom],
      horizontal: true,
      place: (t, l) => drawLabel(l, rect.left + t, rect.bottom + 1.2 + capMm, "center"),
    },
    {
      from: [rect.left, rect.top],
      to: [rect.left, rect.bottom],
      horizontal: false,
      place: (t, l) => drawLabel(l, rect.left - 1, rect.top + t + capMm / 2, "right"),
    },
    {
      from: [rect.right, rect.top],
      to: [rect.right, rect.bottom],
      horizontal: false,
      place: (t, l) => drawLabel(l, rect.right + 1, rect.top + t + capMm / 2, "left"),
    },
  ];

  for (const edge of edges) {
    const samples = sample(edge.from, edge.to);
    const len = samples[samples.length - 1].t;
    const gap = edge.horizontal ? hGap : vGap;
    const axis = dominantAxis(samples);
    const step = labelStep(spacing, mmPerMeter, gap);
    const startMin = Math.max(gap / 2, (edge.reserveStart ?? 0) + gap / 2);
    const crossings = dropOverlapping(
      edgeCrossings(samples, axis, step).filter((c) => c.t >= startMin && c.t <= len - gap / 2),
      gap
    );
    for (const c of crossings) edge.place(c.t, formatGridLabel(c.value, opts.labelFormat));
  }

  pdf.setFont("helvetica", "normal");
}

interface GridInfo {
  zone: number;
  spacing: number | null;
}

function drawAttribution(
  pdf: jsPDF,
  layout: { marginMm: number; mapWidthMm: number; mapHeightMm: number; pageWidthMm: number; pageHeightMm: number },
  scale: number,
  grid: GridInfo | null
) {
  pdf.setFontSize(6);
  pdf.setTextColor(100);

  const y = layout.pageHeightMm - 4;

  // Scale text on left
  let scaleText = `1:${scale.toLocaleString("da-DK")}`;
  if (grid) {
    scaleText += ` | UTM ${grid.zone}N / ETRS89`;
    if (grid.spacing) scaleText += ` | Gitter ${formatSpacing(grid.spacing)}`;
  }
  pdf.text(scaleText, layout.marginMm, y);

  // Attribution on right
  const attribution = `Kortdata: Klimadatastyrelsen | ${getBrand().credit.short}`;
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

  try {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      printState.setGeneratingPage(i + 1);

      if (i > 0) {
        pdf.addPage([layout.pageWidthMm, layout.pageHeightMm], orientation === "landscape" ? "landscape" : "portrait");
      }

      const imgData = await renderMapToImage({
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

      pdf.addImage(imgData, "JPEG", layout.marginMm, layout.marginMm, layout.mapWidthMm, layout.mapHeightMm);

      // Page label
      const pageLabel = `Side ${cell.label}`;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(0);
      pdf.text(pageLabel, layout.marginMm, layout.marginMm - 2);
      const pageLabelMm = pdf.getTextWidth(pageLabel) + 2;

      let gridInfo: GridInfo | null = null;
      if (showUtmGrid) {
        // One zone for all pages (from the overall centre) so sheets line up.
        const opts = gridOptionsFromStore(mapState.viewState.longitude, mapState.viewState.latitude, bearing);
        opts.reserveTopLeftMm = pageLabelMm;
        gridInfo = { zone: opts.zone, spacing: drawUtmGrid(pdf, layout, cell.bounds, scale, opts) };
      }

      drawScaleBar(pdf, layout, scale);
      drawNorthArrow(pdf, layout, bearing);

      drawAttribution(pdf, layout, scale, gridInfo);
    }
  } finally {
    // Reset progress state even if a page render throws, so the UI does not
    // stay stuck on "Side X af Y...".
    printState.setGeneratingPage(0);
    printState.setTotalPages(0);
  }

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

  downloadPdf(pdf, buildFilename(scale, paperFormat, cells.length));
}
