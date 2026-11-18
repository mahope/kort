/**
 * Which country a view or print is in, so the app can pick the map source and
 * the credits without the user knowing which agency maps what. Pure geometry on
 * coarse outlines (regionPolygons.ts), no DOM.
 */
import { COUNTRY_RINGS, type CountryCode } from "./regionPolygons";
import type { LngLatBounds } from "./utmGrid";

export type { CountryCode };

/** "dk" = the Danish sources as before; "nordic" = Kartverket over OpenTopoMap. */
export type MapRegion = "dk" | "nordic";

const COUNTRIES = Object.keys(COUNTRY_RINGS) as CountryCode[];

// Rough bounding box per ring, so most rings are skipped without a full scan.
type Ring = { pts: [number, number][]; w: number; e: number; s: number; n: number };
const RINGS: Record<CountryCode, Ring[]> = Object.fromEntries(
  COUNTRIES.map((c) => [
    c,
    COUNTRY_RINGS[c].map((pts) => ({
      pts,
      w: Math.min(...pts.map((p) => p[0])),
      e: Math.max(...pts.map((p) => p[0])),
      s: Math.min(...pts.map((p) => p[1])),
      n: Math.max(...pts.map((p) => p[1])),
    })),
  ])
) as Record<CountryCode, Ring[]>;

function inRing(lng: number, lat: number, r: Ring): boolean {
  if (lng < r.w || lng > r.e || lat < r.s || lat > r.n) return false;
  let inside = false;
  const p = r.pts;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True when the point lies on the country's (coarse) land outline. */
export function isInCountry(lng: number, lat: number, country: CountryCode): boolean {
  return RINGS[country].some((r) => inRing(lng, lat, r));
}

const KM_PER_DEG_LAT = 111.32;

/** Distance in km from a point to a country's outline (0 inside). */
export function distanceToCountryKm(lng: number, lat: number, country: CountryCode): number {
  if (isInCountry(lng, lat, country)) return 0;
  const kx = KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  let best = Infinity;
  for (const r of RINGS[country]) {
    const p = r.pts;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      // Segment distance in a local equirectangular plane (km).
      const ax = (p[j][0] - lng) * kx;
      const ay = (p[j][1] - lat) * KM_PER_DEG_LAT;
      const bx = (p[i][0] - lng) * kx;
      const by = (p[i][1] - lat) * KM_PER_DEG_LAT;
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return best;
}

/** The country a point is in, or at sea the nearest one. */
export function countryAt(lng: number, lat: number): CountryCode {
  for (const c of COUNTRIES) if (isInCountry(lng, lat, c)) return c;
  let best: CountryCode = "dk";
  let bestKm = Infinity;
  for (const c of COUNTRIES) {
    const d = distanceToCountryKm(lng, lat, c);
    if (d < bestKm) {
      bestKm = d;
      best = c;
    }
  }
  return best;
}

/**
 * The source family for a view or print, from its centre. Denmark (and
 * anything nearer Denmark, e.g. northern Germany) keeps the Danish sources
 * unchanged; Norway and Sweden get the Nordic ones.
 */
export function mapRegionAt(lng: number, lat: number): MapRegion {
  return countryAt(lng, lat) === "dk" ? "dk" : "nordic";
}

export function mapRegionForBounds(b: LngLatBounds): MapRegion {
  return mapRegionAt((b.west + b.east) / 2, (b.south + b.north) / 2);
}

const SAMPLES = 9;

/** Sample points across the bounds (corners, edges and inside). */
function samplePoints(b: LngLatBounds): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < SAMPLES; i++) {
    for (let j = 0; j < SAMPLES; j++) {
      pts.push([b.west + ((b.east - b.west) * i) / (SAMPLES - 1), b.south + ((b.north - b.south) * j) / (SAMPLES - 1)]);
    }
  }
  return pts;
}

// Kartverket's topo also covers Norwegian waters (12 nm, about 22 km): count a
// print as showing Kartverket data this close to Norway at sea. Over Swedish
// land it stops at the border, so there only the outline's slack (about 2 km) counts.
const NORWAY_COVERAGE_KM = 25;
const NORWAY_COVERAGE_OVER_SWEDEN_KM = 3;

/**
 * Which Nordic sources a print of these bounds shows, for the credits.
 * Kartverket draws only Norway (transparent elsewhere); OpenTopoMap fills
 * everything under it, so it shows wherever a sample is clearly outside Norway.
 */
export function nordicSourcesInBounds(b: LngLatBounds): { kartverket: boolean; openTopoMap: boolean } {
  let kartverket = false;
  let openTopoMap = false;
  for (const [lng, lat] of samplePoints(b)) {
    if (isInCountry(lng, lat, "no")) {
      kartverket = true;
      continue;
    }
    const km = distanceToCountryKm(lng, lat, "no");
    const reach = isInCountry(lng, lat, "se") ? NORWAY_COVERAGE_OVER_SWEDEN_KM : NORWAY_COVERAGE_KM;
    if (km <= reach) kartverket = true;
    // Inside the coverage band either source may show: credit both.
    openTopoMap = true;
    if (kartverket && openTopoMap) break;
  }
  return { kartverket, openTopoMap };
}

/** True when any part of the bounds lies on Swedish land (for the SWEREF 99 TM note). */
export function boundsTouchSweden(b: LngLatBounds): boolean {
  return samplePoints(b).some(([lng, lat]) => isInCountry(lng, lat, "se"));
}
