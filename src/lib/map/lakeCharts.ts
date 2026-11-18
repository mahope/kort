import type { PrintFrameBounds } from "@/types/print";
import { transformRequest } from "./styles";
import { soekortDataUrl } from "./vectorOverlays";

/**
 * Geodatastyrelsen's historical lake charts (kortværk "Indsøkort": Thorkild Høy's
 * echo soundings 1950-1990 and older charts from Geodætisk Institut). They are
 * scans without georeferencing, so the map shows a marker per lake and the PDF
 * adds the charts themselves as extra pages.
 */
export interface LakeChart {
  id: string;
  title: string;
  year?: number;
  author?: string;
  /** Scale of the original sheet, e.g. "1:4000". */
  scale?: string;
  /** IIIF image service of the scan (api.dataforsyningen.dk/rest/arkivkort/iiif/3/...). */
  iiif: string;
  lng: number;
  lat: number;
}

interface ChartFeature {
  properties: { id: string; t: string; y?: number; a?: string; m?: string; f: string };
  geometry: { coordinates: [number, number] };
}

export function parseLakeCharts(geojson: { features: ChartFeature[] }): LakeChart[] {
  return geojson.features.map(({ properties: p, geometry }) => ({
    id: p.id,
    title: p.t,
    ...(p.y ? { year: p.y } : {}),
    ...(p.a ? { author: p.a } : {}),
    ...(p.m ? { scale: p.m } : {}),
    iiif: p.f,
    lng: geometry.coordinates[0],
    lat: geometry.coordinates[1],
  }));
}

let cached: Promise<LakeChart[]> | null = null;

/** The chart index (about 100 KB), fetched once per page load. */
export function loadLakeCharts(): Promise<LakeChart[]> {
  cached ??= fetch(soekortDataUrl("indsoekort"))
    .then((r) => {
      if (!r.ok) throw new Error(`indsøkort: HTTP ${r.status}`);
      return r.json();
    })
    .then(parseLakeCharts)
    .catch((err) => {
      cached = null; // try again next time
      throw err;
    });
  return cached;
}

/** At most this many charts are added to one PDF, so a county-wide print stays small. */
export const MAX_CHARTS_PER_PDF = 4;

/**
 * Charts whose lake lies inside the printed area, nearest the centre first. The
 * archive has some charts twice (an original and a later print of the same
 * survey); those are added once.
 */
export function chartsInBounds(
  charts: LakeChart[],
  b: PrintFrameBounds,
  max: number = MAX_CHARTS_PER_PDF
): LakeChart[] {
  const cx = (b.west + b.east) / 2;
  const cy = (b.south + b.north) / 2;
  const seen = new Set<string>();
  return charts
    .filter((c) => c.lng >= b.west && c.lng <= b.east && c.lat >= b.south && c.lat <= b.north)
    .sort((a, z) => Math.hypot(a.lng - cx, a.lat - cy) - Math.hypot(z.lng - cx, z.lat - cy))
    .filter((c) => {
      const key = `${c.title}|${c.author ?? ""}|${c.year ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

/** JPEG of the scan, `widthPx` wide (IIIF Image API 3), with the Dataforsyningen token. */
export function lakeChartImageUrl(chart: Pick<LakeChart, "iiif">, widthPx: number): string {
  return transformRequest(`${chart.iiif}/full/${Math.round(widthPx)},/0/default.jpg`).url;
}

/** "Thorkild Høy, 1981, 1:4000": who, when and the scale of the original. */
export function lakeChartDetails(chart: LakeChart): string {
  return [chart.author, chart.year, chart.scale].filter(Boolean).join(", ");
}
