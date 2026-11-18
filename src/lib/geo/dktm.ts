/**
 * DKTM1-4 (EPSG:4093-4096) — "Dansk Transversal Mercator", four ETRS89
 * transverse Mercator zones tuned for Danish surveying. Unlike UTM's 6°
 * zones, each DKTM zone covers the whole country, so there is no zone
 * boundary to split a grid across.
 *
 * Usage areas per the EPSG registry (a recommendation, not a hard limit —
 * any zone is mathematically valid anywhere in Denmark):
 *  - DKTM1: Jutland west of ~9°45'E
 *  - DKTM2: Jutland east of ~9°45'E and Funen
 *  - DKTM3: Zealand and Lolland-Falster
 *  - DKTM4: Bornholm
 *
 * Parameters verified 13/11-2026 against the EPSG registry (epsg.io/409{3-6},
 * WKT + proj4). DKTM4's scale factor at natural origin is 1 — the other
 * three zones use 0.99998. This corrects a memorized assumption that all
 * four zones shared 0.99998.
 */
import { forwardTm, inverseTm, GRS80, type TmParams, type EastingNorthing, type LatLng } from "./tm";

export type DktmZone = 1 | 2 | 3 | 4;

export const DKTM_PARAMS: Record<DktmZone, TmParams & { epsg: number }> = {
  1: { epsg: 4093, lon0: 9, k0: 0.99998, falseEasting: 200000, falseNorthing: -5000000, ellipsoid: GRS80 },
  2: { epsg: 4094, lon0: 10, k0: 0.99998, falseEasting: 400000, falseNorthing: -5000000, ellipsoid: GRS80 },
  3: { epsg: 4095, lon0: 11.75, k0: 0.99998, falseEasting: 600000, falseNorthing: -5000000, ellipsoid: GRS80 },
  4: { epsg: 4096, lon0: 15, k0: 1, falseEasting: 800000, falseNorthing: -5000000, ellipsoid: GRS80 },
};

export function latlngToDktm(lat: number, lng: number, zone: DktmZone): EastingNorthing {
  return forwardTm(lat, lng, DKTM_PARAMS[zone]);
}

export function dktmToLatlng(easting: number, northing: number, zone: DktmZone): LatLng {
  return inverseTm(easting, northing, DKTM_PARAMS[zone]);
}
