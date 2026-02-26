/**
 * UTM conversion for ETRS89 / UTM zone 32N (EPSG:25832).
 * Denmark falls entirely within UTM zone 32 (6°E - 12°E),
 * with Bornholm in zone 33 but conventionally mapped in zone 32.
 *
 * Also supports UTM zone 33N for Bornholm if needed.
 */

const a = 6378137; // WGS84 semi-major axis
const f = 1 / 298.257223563; // WGS84 flattening
const k0 = 0.9996; // UTM scale factor
const e = Math.sqrt(2 * f - f * f); // eccentricity
const e2 = e * e;
const ep2 = e2 / (1 - e2); // e'^2

/**
 * Convert WGS84 lat/lng to UTM easting/northing.
 * Returns { easting, northing, zone }.
 */
export function latlngToUtm(
  lat: number,
  lng: number,
  forceZone?: number
): { easting: number; northing: number; zone: number } {
  const zone = forceZone ?? Math.floor((lng + 180) / 6) + 1;
  const centralMeridian = (zone - 1) * 6 - 180 + 3;

  const latRad = (lat * Math.PI) / 180;
  const lngRad = ((lng - centralMeridian) * Math.PI) / 180;

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const tanLat = Math.tan(latRad);

  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  const T = tanLat * tanLat;
  const C = ep2 * cosLat * cosLat;
  const A = cosLat * lngRad;

  // Meridional arc
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(4 * latRad) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * latRad));

  const easting =
    k0 *
      N *
      (A +
        ((1 - T + C) * A * A * A) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A * A * A * A * A) /
          120) +
    500000;

  let northing =
    k0 *
    (M +
      N *
        tanLat *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A * A * A * A) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ep2) *
            A *
            A *
            A *
            A *
            A *
            A) /
            720));

  if (lat < 0) northing += 10000000;

  return { easting, northing, zone };
}

/**
 * Convert UTM easting/northing to WGS84 lat/lng.
 */
export function utmToLatlng(
  easting: number,
  northing: number,
  zone: number
): { lat: number; lng: number } {
  const centralMeridian = (zone - 1) * 6 - 180 + 3;
  const x = easting - 500000;
  const y = northing;

  const M = y / k0;
  const mu =
    M /
    (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) * Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = ep2 * cosPhi1 * cosPhi1;
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * k0);

  const lat =
    (phi1 -
      ((N1 * tanPhi1) / R1) *
        ((D * D) / 2 -
          ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D * D * D * D) /
            24 +
          ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) *
            D *
            D *
            D *
            D *
            D *
            D) /
            720)) *
    (180 / Math.PI);

  const lng =
    centralMeridian +
    ((D -
      ((1 + 2 * T1 + C1) * D * D * D) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) *
        D *
        D *
        D *
        D *
        D) /
        120) /
      cosPhi1) *
      (180 / Math.PI);

  return { lat, lng };
}

/**
 * Get a "nice" UTM grid interval in meters for a given map scale.
 */
export function getGridInterval(scale: number): number {
  if (scale <= 10000) return 1000;      // 1 km grid
  if (scale <= 25000) return 1000;      // 1 km grid
  if (scale <= 50000) return 5000;      // 5 km grid
  if (scale <= 100000) return 10000;    // 10 km grid
  if (scale <= 250000) return 25000;    // 25 km grid
  return 50000;                          // 50 km grid
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
export function getUtmZone(lng: number): number {
  return Math.floor((lng + 180) / 6) + 1;
}
