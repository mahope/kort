/**
 * Generic transverse Mercator forward/inverse projection, parameterized by
 * central meridian, scale factor and false easting/northing — the numbers
 * that distinguish one TM-based system from another (a UTM zone, or a
 * DKTM1-4 zone). The formulas themselves (meridional arc, footpoint
 * latitude) are shared; only `utm.ts` and `dktm.ts` know which numbers to
 * plug in, so the maths lives here exactly once.
 */

export interface Ellipsoid {
  /** Semi-major axis, metres. */
  a: number;
  /** Flattening (1/298.xxx). */
  f: number;
}

/** WGS84 — what `utm.ts` has always used. Practically identical to GRS80
 *  for this projection (sub-millimetre over Denmark), kept separate so the
 *  existing UTM output is untouched by this refactor. */
export const WGS84: Ellipsoid = { a: 6378137, f: 1 / 298.257223563 };

/** GRS80 — the ellipsoid ETRS89 (and so DKTM1-4) is formally defined on. */
export const GRS80: Ellipsoid = { a: 6378137, f: 1 / 298.257222101 };

export interface TmParams {
  /** Central meridian / longitude of natural origin, degrees. */
  lon0: number;
  /** Scale factor at natural origin. */
  k0: number;
  falseEasting: number;
  falseNorthing: number;
  /** Defaults to WGS84 (utm.ts's historical choice). */
  ellipsoid?: Ellipsoid;
}

export interface EastingNorthing {
  easting: number;
  northing: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

function ellipsoidTerms(ellipsoid: Ellipsoid) {
  const { a, f } = ellipsoid;
  const e = Math.sqrt(2 * f - f * f);
  const e2 = e * e;
  const ep2 = e2 / (1 - e2); // e'^2
  return { a, e2, ep2 };
}

/** Forward transverse Mercator: lat/lng (degrees) → easting/northing (metres). */
export function forwardTm(lat: number, lng: number, params: TmParams): EastingNorthing {
  const { a, e2, ep2 } = ellipsoidTerms(params.ellipsoid ?? WGS84);
  const k0 = params.k0;

  const latRad = (lat * Math.PI) / 180;
  const lngRad = ((lng - params.lon0) * Math.PI) / 180;

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
    params.falseEasting;

  const northing =
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
              720)) +
    params.falseNorthing;

  return { easting, northing };
}

/** Inverse transverse Mercator: easting/northing (metres) → lat/lng (degrees). */
export function inverseTm(easting: number, northing: number, params: TmParams): LatLng {
  const { a, e2, ep2 } = ellipsoidTerms(params.ellipsoid ?? WGS84);
  const k0 = params.k0;

  const x = easting - params.falseEasting;
  const y = northing - params.falseNorthing;

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
    params.lon0 +
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
