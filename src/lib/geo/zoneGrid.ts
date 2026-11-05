import { getUtmZone } from "./utm";
import { mgrsSquare, type GridSystem } from "./coordinates";
import { computeGridLines, formatGridLabel, type GridLabelFormat, type GridLine, type LngLatBounds, type UtmZoneMode } from "./utmGrid";

export interface ZonedGridLine extends GridLine { zone: number }
type Point = [number, number];

function clipSegment(a: Point, b: Point, bounds: LngLatBounds): [Point, Point] | null {
  let lo = 0, hi = 1;
  for (const [av, bv, min, max] of [
    [a[0], b[0], bounds.west, bounds.east],
    [a[1], b[1], bounds.south, bounds.north],
  ]) {
    const d = bv - av;
    if (d === 0) { if (av < min || av > max) return null; }
    else {
      const t1 = (min - av) / d, t2 = (max - av) / d;
      lo = Math.max(lo, Math.min(t1, t2));
      hi = Math.min(hi, Math.max(t1, t2));
      if (hi <= lo) return null;
    }
  }
  const at = (t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return [at(lo), at(hi)];
}

/** Partition before projecting: no segment ever connects coordinates from different zones. */
export function computeZonedGrid(bounds: LngLatBounds, spacing: number, mode: UtmZoneMode, zone: number): ZonedGridLine[] {
  if (mode === "dk") return computeGridLines(bounds, zone, spacing).map((line) => ({ ...line, zone }));
  const lngCuts = [...new Set([bounds.west, bounds.east,
    ...Array.from({ length: 61 }, (_, i) => i * 6 - 180), 3, 9, 21, 33])]
    .filter((v) => v >= bounds.west && v <= bounds.east).sort((a, b) => a - b);
  const latCuts = [bounds.south, ...[56, 64, 72].filter((v) => v > bounds.south && v < bounds.north), bounds.north];
  const result: ZonedGridLine[] = [];
  for (let x = 0; x < lngCuts.length - 1; x++) {
    for (let y = 0; y < latCuts.length - 1; y++) {
      const box = { west: lngCuts[x], east: lngCuts[x + 1], south: latCuts[y], north: latCuts[y + 1] };
      const z = getUtmZone((box.west + box.east) / 2, (box.south + box.north) / 2);
      for (const line of computeGridLines(box, z, spacing)) {
        let coords: Point[] = [];
        const flush = () => {
          if (coords.length > 1) result.push({ ...line, zone: z, coords });
          coords = [];
        };
        for (let i = 1; i < line.coords.length; i++) {
          const clipped = clipSegment(line.coords[i - 1], line.coords[i], box);
          if (!clipped) { flush(); continue; }
          if (!coords.length) coords.push(clipped[0]);
          coords.push(clipped[1]);
        }
        flush();
      }
    }
  }
  return result;
}

export interface GridIntersection { t: number; label: { prefix: string; main: string } }

/** Intersect the actual projected polylines with a margin, including rotated maps. */
export function gridIntersections(
  lines: ZonedGridLine[], project: (lng: number, lat: number) => { x: number; y: number },
  from: Point, to: Point, system: GridSystem, format: GridLabelFormat,
): GridIntersection[] {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  const out: GridIntersection[] = [];
  for (const line of lines) {
    for (let i = 1; i < line.coords.length; i++) {
      const a = project(...line.coords[i - 1]), b = project(...line.coords[i]);
      const sx = b.x - a.x, sy = b.y - a.y;
      const det = dx * sy - dy * sx;
      if (Math.abs(det) < 1e-12) continue;
      const ax = a.x - from[0], ay = a.y - from[1];
      const t = (ax * sy - ay * sx) / det;
      const u = (ax * dy - ay * dx) / det;
      if (t < 0 || t > 1 || u < 0 || u > 1) continue;
      let label = formatGridLabel(line.value, format);
      if (system === "mgrs") {
        const p = line.coords[i - 1], q = line.coords[i];
        // Choose the square just above/right of a 100 km boundary, rather than
        // letting inverse-projection roundoff select the preceding square.
        const lat = p[1] + (q[1] - p[1]) * u + 1e-7;
        const rawLng = p[0] + (q[0] - p[0]) * u;
        const lng = rawLng + (getUtmZone(rawLng + 1e-7, lat) === line.zone ? 1e-7 : -1e-7);
        const square = mgrsSquare(lat, lng);
        const principal = formatGridLabel(line.value, "short").main;
        label = { prefix: `${square} `, main: principal };
      }
      out.push({ t: t * length, label });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
