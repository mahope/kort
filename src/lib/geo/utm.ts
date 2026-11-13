/**
 * UTM conversion for ETRS89 / UTM zone 32N (EPSG:25832).
 * Denmark falls entirely within UTM zone 32 (6°E - 12°E),
 * with Bornholm in zone 33 but conventionally mapped in zone 32.
 *
 * Also supports UTM zone 33N for Bornholm if needed.
 *
 * The transverse Mercator maths itself lives in tm.ts, parameterized by
 * central meridian / scale / false easting-northing, so DKTM1-4 (dktm.ts)
 * shares it instead of duplicating it. This file only adds UTM's own rules:
 * zone numbering, 500 000 m false easting and the southern-hemisphere
 * 10 000 000 m northing offset.
 */
import { forwardTm, inverseTm, WGS84, type TmParams } from "./tm";

const k0 = 0.9996; // UTM scale factor

function zoneParams(zone: number): TmParams {
  const centralMeridian = (zone - 1) * 6 - 180 + 3;
  return { lon0: centralMeridian, k0, falseEasting: 500000, falseNorthing: 0, ellipsoid: WGS84 };
}

/**
 * Convert WGS84 lat/lng to UTM easting/northing.
 * Returns { easting, northing, zone }.
 */
export function latlngToUtm(
  lat: number,
  lng: number,
  forceZone?: number
): { easting: number; northing: number; zone: number } {
  const zone = forceZone ?? getUtmZone(lng, lat);
  const { easting, northing } = forwardTm(lat, lng, zoneParams(zone));
  return { easting, northing: lat < 0 ? northing + 10000000 : northing, zone };
}

/**
 * Convert UTM easting/northing to WGS84 lat/lng.
 */
export function utmToLatlng(
  easting: number,
  northing: number,
  zone: number
): { lat: number; lng: number } {
  return inverseTm(easting, northing, zoneParams(zone));
}

/**
 * Format UTM coordinate for display.
 * Shows full easting/northing truncated to km.
 */
export function formatUtmCoord(value: number): string {
  return Math.floor(value / 1000).toString();
}

/**
 * Determine UTM zone for a longitude. Denmark is zone 32 (6-12°E).
 */
export function getUtmZone(lng: number, lat?: number): number {
  if (lat !== undefined && lat >= 56 && lat < 64 && lng >= 3 && lng < 12) return 32;
  if (lat !== undefined && lat >= 72 && lat < 84 && lng >= 0 && lng < 42) {
    if (lng < 9) return 31;
    if (lng < 21) return 33;
    if (lng < 33) return 35;
    return 37;
  }
  return Math.min(60, Math.max(1, Math.floor((lng + 180) / 6) + 1));
}
