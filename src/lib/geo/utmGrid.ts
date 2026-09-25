/**
 * Pure UTM-grid logic shared by the on-screen grid and the PDF export:
 * spacing choice, density guards, line hierarchy, grid-line geometry,
 * edge-label positions and label formatting. No DOM / MapLibre / jsPDF here,
 * so everything is unit-testable.
 */
import { latlngToUtm, utmToLatlng, getUtmZone } from "./utm";

/** Selectable grid spacings in metres. */
export const GRID_SPACINGS = [100, 500, 1000, 2000, 5000, 10000] as const;
export type GridSpacingMeters = (typeof GRID_SPACINGS)[number];
/** "auto" = follow zoom on screen and map scale in print. */
export type GridSpacing = "auto" | GridSpacingMeters;

/** "short" = military principal digits (⁵92 / ⁶¹24); "full" = whole km (592 / 6124). */
export type GridLabelFormat = "short" | "full";

/** "dk" = zone 32 for all of Denmark incl. Bornholm (like EPSG:25832 maps); "std" = the standard 6° zone (what a GPS shows). */
export type UtmZoneMode = "dk" | "std";

export type GridLineClass = "major" | "medium" | "minor";

export function isGridSpacing(v: unknown): v is GridSpacingMeters {
  return (GRID_SPACINGS as readonly number[]).includes(v as number);
}

/** Human label for a spacing: "100 m", "1 km". */
export function formatSpacing(m: number): string {
  return m >= 1000 ? `${m / 1000} km` : `${m} m`;
}

// Generous Danish extent (Skagen–Gedser, Esbjerg–Christiansø).
const DK_BOUNDS = { west: 7.5, east: 15.6, south: 54.4, north: 58.0 };

/**
 * UTM zone for a location. In "dk" mode all of Denmark — Bornholm included —
 * uses zone 32, as Danish topographic maps (EPSG:25832) do.
 */
export function resolveUtmZone(lng: number, lat: number, mode: UtmZoneMode): number {
  if (
    mode === "dk" &&
    lng >= DK_BOUNDS.west &&
    lng <= DK_BOUNDS.east &&
    lat >= DK_BOUNDS.south &&
    lat <= DK_BOUNDS.north
  ) {
    return 32;
  }
  return getUtmZone(lng);
}

/** Conventional grid for a printed map scale (1 km up to 1:50.000, as on Danish/NATO topo maps). */
export function autoPrintSpacing(scale: number): GridSpacingMeters {
  if (scale <= 50000) return 1000;
  if (scale <= 100000) return 2000;
  return 10000;
}

/** Screen "auto": the finest spacing that stays at least `targetPx` apart. */
export function autoScreenSpacing(metersPerPixel: number, targetPx = 70): GridSpacingMeters | null {
  for (const s of GRID_SPACINGS) {
    if (s / metersPerPixel >= targetPx) return s;
  }
  return null;
}

/**
 * Density guard: returns the requested spacing, or the next coarser one whose
 * lines are at least `minGap` units apart (px on screen, mm on paper).
 * `spacing` is null when even 10 km is too dense (grid hidden).
 */
export function guardSpacing(
  requested: GridSpacingMeters,
  unitsPerMeter: number,
  minGap: number
): { spacing: GridSpacingMeters | null; coarsened: boolean } {
  const start = GRID_SPACINGS.indexOf(requested);
  for (let i = start; i < GRID_SPACINGS.length; i++) {
    if (GRID_SPACINGS[i] * unitsPerMeter >= minGap) {
      return { spacing: GRID_SPACINGS[i], coarsened: i !== start };
    }
  }
  return { spacing: null, coarsened: true };
}

/**
 * Line hierarchy: every whole 10 km line is "major". In sub-km grids the whole
 * km lines are "medium". In a 10 km grid only the 100 km lines stand out.
 */
export function classifyGridLine(value: number, spacing: number): GridLineClass {
  const v = Math.round(value);
  const majorStep = spacing >= 10000 ? 100000 : 10000;
  if (v % majorStep === 0) return "major";
  if (spacing < 1000 && v % 1000 === 0) return "medium";
  return "minor";
}

/** All multiples of `step` in [min, max]. */
export function gridValues(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  const first = Math.ceil(min / step) * step;
  for (let v = first; v <= max + 1e-6; v += step) out.push(Math.round(v));
  return out;
}

export interface LngLatBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface GridLine {
  axis: "E" | "N";
  value: number;
  cls: GridLineClass;
  /** [lng, lat] vertices */
  coords: [number, number][];
}

/** UTM extent covering a lng/lat box (corners and edge midpoints, since grid convergence skews it). */
export function utmExtent(b: LngLatBounds, zone: number) {
  const pts: [number, number][] = [];
  for (const lat of [b.south, (b.south + b.north) / 2, b.north]) {
    for (const lng of [b.west, (b.west + b.east) / 2, b.east]) pts.push([lat, lng]);
  }
  let minE = Infinity, maxE = -Infinity, minN = Infinity, maxN = -Infinity;
  for (const [lat, lng] of pts) {
    const u = latlngToUtm(lat, lng, zone);
    minE = Math.min(minE, u.easting);
    maxE = Math.max(maxE, u.easting);
    minN = Math.min(minN, u.northing);
    maxN = Math.max(maxN, u.northing);
  }
  return { minE, maxE, minN, maxN };
}

/**
 * Grid lines covering `bounds`. Lines are sampled so the slight curvature of
 * UTM lines in Web Mercator is kept (max ~20 samples per line).
 */
export function computeGridLines(
  bounds: LngLatBounds,
  zone: number,
  spacing: number,
  maxLinesPerAxis = 1000
): GridLine[] {
  const ext = utmExtent(bounds, zone);
  const minE = Math.floor(ext.minE / spacing) * spacing;
  const maxE = Math.ceil(ext.maxE / spacing) * spacing;
  const minN = Math.floor(ext.minN / spacing) * spacing;
  const maxN = Math.ceil(ext.maxN / spacing) * spacing;
  const eVals = gridValues(minE, maxE, spacing);
  const nVals = gridValues(minN, maxN, spacing);
  if (eVals.length > maxLinesPerAxis || nVals.length > maxLinesPerAxis) return [];

  const sampleStep = (span: number) => Math.max(spacing, span / 20);
  const lines: GridLine[] = [];

  const nStep = sampleStep(maxN - minN);
  for (const e of eVals) {
    const coords: [number, number][] = [];
    for (let n = minN; n < maxN; n += nStep) {
      const ll = utmToLatlng(e, n, zone);
      coords.push([ll.lng, ll.lat]);
    }
    const end = utmToLatlng(e, maxN, zone);
    coords.push([end.lng, end.lat]);
    lines.push({ axis: "E", value: e, cls: classifyGridLine(e, spacing), coords });
  }

  const eStep = sampleStep(maxE - minE);
  for (const n of nVals) {
    const coords: [number, number][] = [];
    for (let e = minE; e < maxE; e += eStep) {
      const ll = utmToLatlng(e, n, zone);
      coords.push([ll.lng, ll.lat]);
    }
    const end = utmToLatlng(maxE, n, zone);
    coords.push([end.lng, end.lat]);
    lines.push({ axis: "N", value: n, cls: classifyGridLine(n, spacing), coords });
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export interface FormattedLabel {
  /** Small leading digits (superscript), may be empty. */
  prefix: string;
  /** Large principal digits. */
  main: string;
}

/**
 * Format a grid value for the map margin.
 *  short: easting 592000 → { prefix: "5", main: "92" }; northing 6124000 → { "61", "24" }
 *  full:  easting 592000 → { "", "592" };               northing 6124000 → { "", "6124" }
 * Sub-km lines get a decimal: 592300 → "92,3" / "592,3".
 */
export function formatGridLabel(value: number, format: GridLabelFormat): FormattedLabel {
  const v = Math.round(value);
  const km = Math.floor(v / 1000);
  const rest = v - km * 1000;
  const frac = rest === 0 ? "" : "," + String(rest / 1000).slice(2).replace(/0+$/, "");
  if (format === "full") return { prefix: "", main: `${km}${frac}` };
  const kmStr = String(km).padStart(2, "0");
  return { prefix: kmStr.slice(0, -2), main: kmStr.slice(-2) + frac };
}

export function labelText(l: FormattedLabel): string {
  return l.prefix + l.main;
}

/**
 * Label thinning step: the smallest multiple of `spacing` (×1, 2, 5, 10, …)
 * whose labels are at least `minGap` units apart.
 */
export function labelStep(spacing: number, unitsPerMeter: number, minGap: number): number {
  const mult = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  for (const m of mult) {
    if (spacing * m * unitsPerMeter >= minGap) return spacing * m;
  }
  return spacing * mult[mult.length - 1];
}

/** A sample along a map edge: position `t` (px/mm along the edge) and its UTM coordinate. */
export interface EdgeSample {
  t: number;
  e: number;
  n: number;
}

/** Axis that changes most along an edge — eastings on top/bottom, northings on left/right (also when rotated). */
export function dominantAxis(samples: EdgeSample[]): "E" | "N" {
  const a = samples[0];
  const b = samples[samples.length - 1];
  return Math.abs(b.e - a.e) >= Math.abs(b.n - a.n) ? "E" : "N";
}

/**
 * Where grid values that are multiples of `step` cross an edge, found by
 * linear interpolation between consecutive samples. Sorted by position.
 */
export function edgeCrossings(
  samples: EdgeSample[],
  axis: "E" | "N",
  step: number
): { t: number; value: number }[] {
  const key = axis === "E" ? "e" : "n";
  const out: { t: number; value: number }[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const va = a[key];
    const vb = b[key];
    if (va === vb) continue;
    const lo = Math.min(va, vb);
    const hi = Math.max(va, vb);
    for (const v of gridValues(lo, hi, step)) {
      if (seen.has(v)) continue;
      seen.add(v);
      const t = a.t + ((v - va) / (vb - va)) * (b.t - a.t);
      out.push({ t, value: v });
    }
  }
  return out.sort((x, y) => x.t - y.t);
}

/** Greedy overlap removal: drop labels closer than `minGap` to the previously kept one. */
export function dropOverlapping<T extends { t: number }>(items: T[], minGap: number): T[] {
  const sorted = [...items].sort((a, b) => a.t - b.t);
  const kept: T[] = [];
  for (const it of sorted) {
    if (kept.length === 0 || it.t - kept[kept.length - 1].t >= minGap) kept.push(it);
  }
  return kept;
}

/** Ground metres per CSS pixel in MapLibre (512 px tiles) at a latitude/zoom. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * Math.pow(2, zoom));
}

// ---------------------------------------------------------------------------
// Resolving the effective spacing for a medium
// ---------------------------------------------------------------------------

/** Minimum distance between printed grid lines. 100 m at 1:25.000 = 4 mm is fine; at 1:50.000 = 2 mm is not. */
export const PRINT_MIN_LINE_GAP_MM = 3;
/** Minimum distance between grid lines on screen. */
export const SCREEN_MIN_LINE_GAP_PX = 8;

export interface ResolvedSpacing {
  /** What the user asked for (auto resolved to a concrete value). */
  requested: GridSpacingMeters | null;
  /** What is actually drawn; null = grid hidden (too dense). */
  spacing: GridSpacingMeters | null;
  /** True when the density guard switched to a coarser grid. */
  coarsened: boolean;
}

export function resolvePrintSpacing(setting: GridSpacing, scale: number): ResolvedSpacing {
  const requested = setting === "auto" ? autoPrintSpacing(scale) : setting;
  const g = guardSpacing(requested, 1000 / scale, PRINT_MIN_LINE_GAP_MM);
  return { requested, ...g };
}

export function resolveScreenSpacing(setting: GridSpacing, mpp: number): ResolvedSpacing {
  if (setting === "auto") {
    const s = autoScreenSpacing(mpp);
    return { requested: s, spacing: s, coarsened: false };
  }
  const g = guardSpacing(setting, 1 / mpp, SCREEN_MIN_LINE_GAP_PX);
  return { requested: setting, ...g };
}
