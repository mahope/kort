import { jsPDF } from "jspdf";
import type { PaperFormat, Orientation, DpiOption, PrintFrameBounds } from "@/types/print";
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
import { OVERLAY_SOURCES } from "@/lib/map/sources";
import { timed, yieldToMain } from "./timing";
import { applyPrintPreferences, drawControlLine } from "./controlLine";
import { calculateMultiPageGrid, calculatePrintArea } from "@/lib/geo/calculations";
import { LARGE_FORMATS, printDpi } from "@/constants/paperFormats";
import { effectiveDpi, getMaxCanvasSize } from "./limits";
import {
  assembledSizeCm,
  drawAssemblyMarks,
  drawCropMarks,
  drawOverview,
  overviewCells,
  overviewPlacement,
  sheetNeighbours,
} from "./assembly";
import { computeZonedGrid, gridIntersections, type ZonedGridLine } from "@/lib/geo/zoneGrid";
import { mgrsSquare, type GridSystem } from "@/lib/geo/coordinates";
import {
  dropOverlapping,
  formatGridLabel,
  formatSpacing,
  resolvePrintSpacing,
  resolveUtmZone,
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
async function downloadPdf(pdf: jsPDF, filename: string): Promise<void> {
  const blob = await timed("output", () => pdf.output("blob"));
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

/** Where the generation is, for the progress text on the download button. */
export interface PdfProgress {
  stage: "render" | "assemble";
  tilesLoaded: number;
  tilesTotal: number;
}

interface GeneratePdfOptions {
  bounds: PrintFrameBounds;
  scale: number;
  paperFormat: PaperFormat;
  orientation: Orientation;
  dpi: DpiOption;
  onProgress?: (progress: PdfProgress) => void;
}

export const MULTIPAGE_ROTATION_MESSAGE =
  "Flersidet udskrift kan ikke drejes, for så passer arkene ikke sammen. Sæt rotationen til 0° under Udskrivning.";

export async function generatePdf({
  bounds,
  scale,
  paperFormat,
  orientation,
  dpi: requestedDpi,
  onProgress,
}: GeneratePdfOptions): Promise<void> {
  const printState = usePrintStore.getState();
  // A1/A0 are print-shop sheets: capped at 150 dpi, and lower still on a
  // device that cannot render that canvas (there is no lower DPI to pick).
  let dpi = printDpi(paperFormat, requestedDpi) as DpiOption;
  if (LARGE_FORMATS.includes(paperFormat)) {
    dpi = effectiveDpi(paperFormat, orientation, dpi, getMaxCanvasSize()) as DpiOption;
  }

  // Delegate to multi-page if enabled
  if (printState.multiPage) {
    // Sheets are laid out unrotated; turned sheets would not fit together.
    if (Math.abs(useMapStore.getState().viewState.bearing) > 0.5) {
      throw new Error(MULTIPAGE_ROTATION_MESSAGE);
    }
    return generateMultiPagePdf({ bounds, scale, paperFormat, orientation, dpi, onProgress });
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

  // Render map at target resolution (returns JPEG bytes)
  onProgress?.({ stage: "render", tilesLoaded: 0, tilesTotal: 0 });
  const imgData = await timed("render", () => renderMapToImage({
    onTileProgress: (tilesLoaded, tilesTotal) => onProgress?.({ stage: "render", tilesLoaded, tilesTotal }),
    bounds,
    canvasWidth: layout.canvasWidth,
    canvasHeight: layout.canvasHeight,
    style,
    baseLayer,
    overlays,
    importedLayers,
    drawnFeatures,
    bearing,
  }));

  onProgress?.({ stage: "assemble", tilesLoaded: 0, tilesTotal: 0 });
  await yieldToMain();

  // Create PDF
  const pdf = new jsPDF({
    orientation: orientation === "landscape" ? "landscape" : "portrait",
    unit: "mm",
    format: [layout.pageWidthMm, layout.pageHeightMm],
  });
  applyPrintPreferences(pdf);

  // Add map image
  await timed("addImage", () =>
    pdf.addImage(imgData, "JPEG", layout.marginMm, layout.marginMm, layout.mapWidthMm, layout.mapHeightMm)
  );

  // Draw UTM grid lines + margin labels if enabled
  await yieldToMain();
  let gridInfo: GridInfo | null = null;
  if (showUtmGrid) {
    const opts = gridOptionsFromStore((bounds.west + bounds.east) / 2, (bounds.north + bounds.south) / 2, bearing);
    gridInfo = { system: opts.system, square: opts.square, zone: opts.zone, spacing: drawUtmGrid(pdf, layout, bounds, scale, opts) };
  }

  // Draw decorations
  const declinationDiagram = await loadDeclinationDiagram();
  drawScaleBar(pdf, layout, scale);
  drawNorthArrow(pdf, layout, bearing);
  drawControlLine(pdf, layout);
  drawAttribution(pdf, layout, scale, gridInfo);
  drawThirdPartyCredits(pdf, layout.marginMm + 1.5, layout.marginMm + 1.5, creditsWidthMm(layout.mapWidthMm));
  drawDeclination(declinationDiagram, pdf, layout, bounds, gridInfo, bearing);

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

  await yieldToMain();
  await downloadPdf(pdf, buildFilename(scale, paperFormat));
}

export function drawScaleBar(
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

export function drawNorthArrow(
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
  system: GridSystem;
  zoneMode: "dk" | "std";
  square: string;
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
    system: m.gridSystem,
    zoneMode: m.gridSystem === "mgrs" ? "std" : m.utmZoneMode,
    square: mgrsSquare(zoneLat, zoneLng),
    spacing: m.gridSpacing,
    showLabels: m.showGridLabels,
    labelFormat: m.gridLabelFormat,
    zone: resolveUtmZone(zoneLng, zoneLat, m.gridSystem === "mgrs" ? "std" : m.utmZoneMode),
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
  const lines = computeZonedGrid(cover, spacing, opts.zoneMode, zone);

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
    drawGridLabels(pdf, proj, { left, top, right, bottom }, layout.marginMm, spacing, lines, opts);
  }
  return spacing;
}

function drawGridLabels(
  pdf: jsPDF,
  proj: PaperProjector,
  rect: { left: number; top: number; right: number; bottom: number },
  marginMm: number,
  spacing: number,
  lines: ZonedGridLine[],
  opts: GridOptions
) {
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");

  const measure = (l: FormattedLabel, k: number) => {
    pdf.setFontSize(PREFIX_PT * k);
    const wp = l.prefix ? pdf.getTextWidth(l.prefix) : 0;
    pdf.setFontSize(LABEL_PT * k);
    return { wp, wm: pdf.getTextWidth(l.main) };
  };

  // Shrink the font if the widest possible northing label would not fit the side margin.
  const widest = opts.system === "mgrs" ? { prefix: "", main: spacing < 1000 ? "WW 99,9" : "WW 99" } : formatGridLabel(spacing < 1000 ? 6999900 : 6999000, opts.labelFormat);
  const w1 = measure(widest, 1);
  const k = Math.min(1, (marginMm - 2) / (w1.wp + w1.wm));

  const drawLabel = (l: FormattedLabel, x: number, baseline: number, align: "center" | "left" | "right") => {
    if (opts.system === "mgrs") {
      const [zone, square] = l.prefix.trim().split(" ");
      pdf.setFontSize(5);
      pdf.text(zone, x, baseline - 2.2, { align });
      pdf.setFontSize(LABEL_PT * k);
      pdf.text(`${square} ${l.main}`, x, baseline, { align });
      return;
    }
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
  const vGap = opts.system === "mgrs" ? capMm + 4 : capMm + 2.5;

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
    const len = Math.hypot(edge.to[0] - edge.from[0], edge.to[1] - edge.from[1]);
    const gap = edge.horizontal ? hGap : vGap;
    const startMin = Math.max(gap / 2, (edge.reserveStart ?? 0) + gap / 2);
    const crossings = dropOverlapping(
      gridIntersections(lines, proj.toMm, edge.from, edge.to, opts.system, opts.labelFormat).filter((c) => c.t >= startMin && c.t <= len - gap / 2),
      gap
    );
    for (const c of crossings) edge.place(c.t, c.label);
  }

  pdf.setFont("helvetica", "normal");
}

interface GridInfo {
  system: GridSystem;
  square: string;
  zone: number;
  spacing: number | null;
}

export function drawAttribution(
  pdf: jsPDF,
  layout: { marginMm: number; mapWidthMm: number; mapHeightMm: number; pageWidthMm: number; pageHeightMm: number },
  scale: number,
  grid: GridInfo | null,
  /** Replaces the scale/grid text on the left (e.g. on the overview page). */
  leftText?: string
) {
  pdf.setFontSize(6);
  pdf.setTextColor(100);

  const y = layout.pageHeightMm - 4;

  // Scale text on left
  let scaleText = `1:${scale.toLocaleString("da-DK")}`;
  if (grid) {
    scaleText += grid.system === "mgrs" ? ` | MGRS ${grid.square} / WGS84` : ` | UTM ${grid.zone}N / ETRS89`;
    if (grid.spacing) scaleText += ` | Gitter ${formatSpacing(grid.spacing)}`;
  }
  pdf.text(leftText ?? scaleText, layout.marginMm, y);

  // Attribution on right
  const attribution = `Kortdata: Klimadatastyrelsen | ${getBrand().credit.short}`;
  pdf.text(attribution, layout.pageWidthMm - layout.marginMm, y, {
    align: "right",
  });
}

/**
 * Third-party credits (OSM base map, EMODnet, OpenSeaMap) and, for sea
 * layers, a bold "IKKE TIL NAVIGATION", in a white box in the top-left corner
 * of the map image: the margins hold the grid labels and the footer. Text is
 * wrapped to the box width so it also fits A5.
 */
export function drawThirdPartyCredits(pdf: jsPDF, x: number, y: number, maxWidthMm: number): void {
  const extra = thirdPartyCredits();
  if (extra.credits.length === 0 && !extra.notForNavigation) return;
  const pad = 1.2;
  const textW = maxWidthMm - 2 * pad;
  const lines: { text: string; bold: boolean; pt: number }[] = [];
  if (extra.notForNavigation) lines.push({ text: "IKKE TIL NAVIGATION", bold: true, pt: 7 });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  for (const c of extra.credits) {
    for (const l of pdf.splitTextToSize(c, textW) as string[]) lines.push({ text: l, bold: false, pt: 6 });
  }
  const lineMm = (pt: number) => pt * 0.3528 * 1.25;
  let w = 0;
  for (const l of lines) {
    pdf.setFont("helvetica", l.bold ? "bold" : "normal");
    pdf.setFontSize(l.pt);
    w = Math.max(w, pdf.getTextWidth(l.text));
  }
  const h = lines.reduce((sum, l) => sum + lineMm(l.pt), 0);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, w + 2 * pad, h + 2 * pad - 0.4, "F");
  let ty = y + pad;
  pdf.setTextColor(0);
  for (const l of lines) {
    ty += lineMm(l.pt);
    pdf.setFont("helvetica", l.bold ? "bold" : "normal");
    pdf.setFontSize(l.pt);
    pdf.text(l.text, x + pad, ty - 0.6);
  }
  pdf.setFont("helvetica", "normal");
}

/** Credit box width: clear of the north arrow in the top-right corner. */
function creditsWidthMm(mapWidthMm: number): number {
  return Math.min(110, mapWidthMm - 24);
}

/** Credits for non-KDS data in the print: OSM base map and third-party overlays. */
export function thirdPartyCredits(): { credits: string[]; notForNavigation: boolean } {
  const { baseLayer, overlays } = useMapStore.getState();
  const credits: string[] = [];
  let notForNavigation = false;
  if (baseLayer === "osm") credits.push("Kort: OpenStreetMap-bidragydere (ODbL)");
  for (const o of overlays) {
    if (!o.enabled) continue;
    const src = OVERLAY_SOURCES[o.id];
    if (src.credit) credits.push(src.credit);
    if (src.notForNavigation) notForNavigation = true;
  }
  return { credits, notForNavigation };
}

type DeclinationDiagram = typeof import("./declinationDiagram");

/** Loads the declination model on demand, and only when the diagram is switched on. */
export async function loadDeclinationDiagram(): Promise<DeclinationDiagram | null> {
  return usePrintStore.getState().showDeclination ? import("./declinationDiagram") : null;
}

/** Misvisning diagram for the frame centre; grid north only when a UTM/MGRS grid is on. */
export function drawDeclination(
  diagram: DeclinationDiagram | null,
  pdf: jsPDF,
  layout: PdfLayout,
  bounds: PrintFrameBounds,
  gridInfo: GridInfo | null,
  bearing: number
) {
  if (!diagram) return;
  const info = diagram.computeDeclinationInfo(
    (bounds.north + bounds.south) / 2,
    (bounds.west + bounds.east) / 2,
    gridInfo ? gridInfo.zone : null
  );
  if (info) diagram.drawDeclinationDiagram(pdf, layout, info, bearing);
}

async function generateMultiPagePdf({
  scale,
  paperFormat,
  orientation,
  dpi,
  onProgress,
}: GeneratePdfOptions): Promise<void> {
  const mapState = useMapStore.getState();
  const printState = usePrintStore.getState();
  const style: MapStyle = mapState.style;
  const baseLayer: BaseLayer = mapState.baseLayer;
  const overlays: OverlayState[] = mapState.overlays;
  const importedLayers = useImportStore.getState().layers;
  const drawnFeatures = useDrawStore.getState().features;
  const showUtmGrid = mapState.showUtmGrid;
  // Sheets are cut from a north-up grid; a sub-threshold bearing (rotations
  // above it are refused) would turn each sheet about its own centre.
  const bearing = 0;
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

  // A sheet grid gets an overview page first (skipped for a single sheet).
  const withOverview = cells.length > 1;
  const totalPages = cells.length + (withOverview ? 1 : 0);
  printState.setTotalPages(totalPages);
  const { gridCols, gridRows, overlapMm } = printState;

  const pdf = new jsPDF({
    orientation: orientation === "landscape" ? "landscape" : "portrait",
    unit: "mm",
    format: [layout.pageWidthMm, layout.pageHeightMm],
  });
  applyPrintPreferences(pdf);

  let declinationDiagram: DeclinationDiagram | null = null;
  try {
    declinationDiagram = await loadDeclinationDiagram();
    if (withOverview) {
      printState.setGeneratingPage(1);
      const area = calculatePrintArea(paperFormat, orientation, scale);
      const overlapM = (overlapMm * scale) / 1000;
      const groundW = area.groundWidthM + (gridCols - 1) * (area.groundWidthM - overlapM);
      const groundH = area.groundHeightM + (gridRows - 1) * (area.groundHeightM - overlapM);
      const place = overviewPlacement(layout, groundW, groundH);
      const totalBounds = {
        west: Math.min(...cells.map((c) => c.bounds.west)),
        east: Math.max(...cells.map((c) => c.bounds.east)),
        south: Math.min(...cells.map((c) => c.bounds.south)),
        north: Math.max(...cells.map((c) => c.bounds.north)),
      };
      onProgress?.({ stage: "render", tilesLoaded: 0, tilesTotal: 0 });
      // A small, quick render: the overview is for orientation, not for reading.
      const overviewImg = await renderMapToImage({
        onTileProgress: (tilesLoaded, tilesTotal) => onProgress?.({ stage: "render", tilesLoaded, tilesTotal }),
        bounds: totalBounds,
        canvasWidth: Math.round((place.w / 25.4) * 100),
        canvasHeight: Math.round((place.h / 25.4) * 100),
        style,
        baseLayer,
        overlays,
        importedLayers,
        drawnFeatures,
        bearing: 0,
      });
      onProgress?.({ stage: "assemble", tilesLoaded: 0, tilesTotal: 0 });
      pdf.addImage(overviewImg, "JPEG", place.x, place.y, place.w, place.h);
      drawOverview(pdf, layout, place, overviewCells(place, gridCols, gridRows, area.groundWidthM, area.groundHeightM, overlapM), {
        cols: gridCols,
        rows: gridRows,
        paper: paperFormat,
        scale,
        overlapMm,
        assembled: assembledSizeCm(layout, gridCols, gridRows, overlapMm),
      });
      drawAttribution(pdf, layout, scale, null, "Oversigt, ikke i målestok");
      drawThirdPartyCredits(pdf, place.x + 1.5, place.y + 1.5, creditsWidthMm(place.w));
    }

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const pageNo = i + 1 + (withOverview ? 1 : 0);
      printState.setGeneratingPage(pageNo);

      if (pageNo > 1) {
        pdf.addPage([layout.pageWidthMm, layout.pageHeightMm], orientation === "landscape" ? "landscape" : "portrait");
      }

      onProgress?.({ stage: "render", tilesLoaded: 0, tilesTotal: 0 });
      const imgData = await renderMapToImage({
        onTileProgress: (tilesLoaded, tilesTotal) => onProgress?.({ stage: "render", tilesLoaded, tilesTotal }),
        bounds: cell.bounds,
        canvasWidth: layout.canvasWidth,
        canvasHeight: layout.canvasHeight,
        style,
        baseLayer,
        overlays,
        importedLayers,
        drawnFeatures,
        bearing,
      });

      onProgress?.({ stage: "assemble", tilesLoaded: 0, tilesTotal: 0 });
      await yieldToMain();
      pdf.addImage(imgData, "JPEG", layout.marginMm, layout.marginMm, layout.mapWidthMm, layout.mapHeightMm);

      // Sheet label, with page number so a stack can be put back in order.
      const pageLabel = `Ark ${cell.label} (side ${pageNo} af ${totalPages})`;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(0);
      // Starts 2 mm in, clear of the vertical crop mark at the map corner.
      pdf.text(pageLabel, layout.marginMm + 2, layout.marginMm - 2);
      const pageLabelMm = pdf.getTextWidth(pageLabel) + 4;
      pdf.setFont("helvetica", "normal");
      drawCropMarks(pdf, layout);

      let gridInfo: GridInfo | null = null;
      if (showUtmGrid) {
        const opts = gridOptionsFromStore((cell.bounds.west + cell.bounds.east) / 2, (cell.bounds.south + cell.bounds.north) / 2, bearing);
        opts.reserveTopLeftMm = pageLabelMm;
        gridInfo = { system: opts.system, square: opts.square, zone: opts.zone, spacing: drawUtmGrid(pdf, layout, cell.bounds, scale, opts) };
      }
      // After the grid, so the white box keeps grid lines off the hint.
      drawAssemblyMarks(pdf, layout, sheetNeighbours(cell, gridCols, gridRows), overlapMm);

      drawScaleBar(pdf, layout, scale);
      drawNorthArrow(pdf, layout, bearing);
      drawControlLine(pdf, layout);

      drawAttribution(pdf, layout, scale, gridInfo);
      drawThirdPartyCredits(pdf, layout.marginMm + 1.5, layout.marginMm + 1.5, creditsWidthMm(layout.mapWidthMm));
      drawDeclination(declinationDiagram, pdf, layout, cell.bounds, gridInfo, bearing);
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

  await downloadPdf(pdf, buildFilename(scale, paperFormat, cells.length));
}
