/**
 * Magnetic declination ("misvisning") from the World Magnetic Model WMM2025
 * (NOAA/NCEI + BGS, public domain, valid 2025.0 to 2030.0), plus UTM meridian
 * convergence for the grid-north / true-north / magnetic-north diagram.
 *
 * Coefficients are copied verbatim from NOAA's WMM2025COF.zip (WMM.COF).
 * Positive declination = magnetic north lies east of true north.
 */

export const WMM_MODEL = "WMM2025";
export const WMM_EPOCH = 2025.0;
/** The model is only valid for epoch + 5 years. */
export const WMM_VALID_UNTIL = WMM_EPOCH + 5;

/** Rows: [n, m, g, h, gDot, hDot] (nT, nT/yr). */
const WMM_COEFFICIENTS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [1, 0, -29351.8, 0, 12, 0],
  [1, 1, -1410.8, 4545.4, 9.7, -21.5],
  [2, 0, -2556.6, 0, -11.6, 0],
  [2, 1, 2951.1, -3133.6, -5.2, -27.7],
  [2, 2, 1649.3, -815.1, -8, -12.1],
  [3, 0, 1361, 0, -1.3, 0],
  [3, 1, -2404.1, -56.6, -4.2, 4],
  [3, 2, 1243.8, 237.5, 0.4, -0.3],
  [3, 3, 453.6, -549.5, -15.6, -4.1],
  [4, 0, 895, 0, -1.6, 0],
  [4, 1, 799.5, 278.6, -2.4, -1.1],
  [4, 2, 55.7, -133.9, -6, 4.1],
  [4, 3, -281.1, 212, 5.6, 1.6],
  [4, 4, 12.1, -375.6, -7, -4.4],
  [5, 0, -233.2, 0, 0.6, 0],
  [5, 1, 368.9, 45.4, 1.4, -0.5],
  [5, 2, 187.2, 220.2, 0, 2.2],
  [5, 3, -138.7, -122.9, 0.6, 0.4],
  [5, 4, -142, 43, 2.2, 1.7],
  [5, 5, 20.9, 106.1, 0.9, 1.9],
  [6, 0, 64.4, 0, -0.2, 0],
  [6, 1, 63.8, -18.4, -0.4, 0.3],
  [6, 2, 76.9, 16.8, 0.9, -1.6],
  [6, 3, -115.7, 48.8, 1.2, -0.4],
  [6, 4, -40.9, -59.8, -0.9, 0.9],
  [6, 5, 14.9, 10.9, 0.3, 0.7],
  [6, 6, -60.7, 72.7, 0.9, 0.9],
  [7, 0, 79.5, 0, 0, 0],
  [7, 1, -77, -48.9, -0.1, 0.6],
  [7, 2, -8.8, -14.4, -0.1, 0.5],
  [7, 3, 59.3, -1, 0.5, -0.8],
  [7, 4, 15.8, 23.4, -0.1, 0],
  [7, 5, 2.5, -7.4, -0.8, -1],
  [7, 6, -11.1, -25.1, -0.8, 0.6],
  [7, 7, 14.2, -2.3, 0.8, -0.2],
  [8, 0, 23.2, 0, -0.1, 0],
  [8, 1, 10.8, 7.1, 0.2, -0.2],
  [8, 2, -17.5, -12.6, 0, 0.5],
  [8, 3, 2, 11.4, 0.5, -0.4],
  [8, 4, -21.7, -9.7, -0.1, 0.4],
  [8, 5, 16.9, 12.7, 0.3, -0.5],
  [8, 6, 15, 0.7, 0.2, -0.6],
  [8, 7, -16.8, -5.2, 0, 0.3],
  [8, 8, 0.9, 3.9, 0.2, 0.2],
  [9, 0, 4.6, 0, 0, 0],
  [9, 1, 7.8, -24.8, -0.1, -0.3],
  [9, 2, 3, 12.2, 0.1, 0.3],
  [9, 3, -0.2, 8.3, 0.3, -0.3],
  [9, 4, -2.5, -3.3, -0.3, 0.3],
  [9, 5, -13.1, -5.2, 0, 0.2],
  [9, 6, 2.4, 7.2, 0.3, -0.1],
  [9, 7, 8.6, -0.6, -0.1, -0.2],
  [9, 8, -8.7, 0.8, 0.1, 0.4],
  [9, 9, -12.9, 10, -0.1, 0.1],
  [10, 0, -1.3, 0, 0.1, 0],
  [10, 1, -6.4, 3.3, 0, 0],
  [10, 2, 0.2, 0, 0.1, 0],
  [10, 3, 2, 2.4, 0.1, -0.2],
  [10, 4, -1, 5.3, 0, 0.1],
  [10, 5, -0.6, -9.1, -0.3, -0.1],
  [10, 6, -0.9, 0.4, 0, 0.1],
  [10, 7, 1.5, -4.2, -0.1, 0],
  [10, 8, 0.9, -3.8, -0.1, -0.1],
  [10, 9, -2.7, 0.9, 0, 0.2],
  [10, 10, -3.9, -9.1, 0, 0],
  [11, 0, 2.9, 0, 0, 0],
  [11, 1, -1.5, 0, 0, 0],
  [11, 2, -2.5, 2.9, 0, 0.1],
  [11, 3, 2.4, -0.6, 0, 0],
  [11, 4, -0.6, 0.2, 0, 0.1],
  [11, 5, -0.1, 0.5, -0.1, 0],
  [11, 6, -0.6, -0.3, 0, 0],
  [11, 7, -0.1, -1.2, 0, 0.1],
  [11, 8, 1.1, -1.7, -0.1, 0],
  [11, 9, -1, -2.9, -0.1, 0],
  [11, 10, -0.2, -1.8, -0.1, 0],
  [11, 11, 2.6, -2.3, -0.1, 0],
  [12, 0, -2, 0, 0, 0],
  [12, 1, -0.2, -1.3, 0, 0],
  [12, 2, 0.3, 0.7, 0, 0],
  [12, 3, 1.2, 1, 0, -0.1],
  [12, 4, -1.3, -1.4, 0, 0.1],
  [12, 5, 0.6, 0, 0, 0],
  [12, 6, 0.6, 0.6, 0.1, 0],
  [12, 7, 0.5, -0.1, 0, 0],
  [12, 8, -0.1, 0.8, 0, 0],
  [12, 9, -0.4, 0.1, 0, 0],
  [12, 10, -0.2, -1, -0.1, 0],
  [12, 11, -1.3, 0.1, 0, 0],
  [12, 12, -0.7, 0.2, -0.1, -0.1],
];

const A_KM = 6378.137; // WGS84 semi-major axis
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const A_REF_KM = 6371.2; // WMM geomagnetic reference radius
const RAD = Math.PI / 180;
const N_MAX = 12;

/** Decimal year (UTC) of a Date, e.g. 2026-11-05 -> 2026.84. */
export function decimalYear(date: Date): number {
  const y = date.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (date.getTime() - start) / (end - start);
}

/** True if a decimal year lies inside the model's validity window. */
export function isWithinWmmValidity(year: number): boolean {
  return year >= WMM_EPOCH && year < WMM_VALID_UNTIL;
}

/**
 * Magnetic declination in degrees (east positive) at a WGS84 position.
 * @param heightKm height above the ellipsoid (default 0)
 * @throws RangeError when the date is outside the model's validity window
 */
export function magneticDeclinationAtYear(lat: number, lng: number, year: number, heightKm = 0): number {
  if (!isWithinWmmValidity(year)) {
    throw new RangeError(`${WMM_MODEL} is only valid for ${WMM_EPOCH} to ${WMM_VALID_UNTIL}, got ${year.toFixed(2)}`);
  }
  // Geodetic -> geocentric spherical coordinates.
  const phi = Math.max(-89.999, Math.min(89.999, lat)) * RAD;
  const lam = lng * RAD;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const rc = A_KM / Math.sqrt(1 - E2 * sinPhi * sinPhi);
  const p = (rc + heightKm) * cosPhi;
  const z = (rc * (1 - E2) + heightKm) * sinPhi;
  const r = Math.hypot(p, z);
  const phiG = Math.asin(z / r);
  const x = Math.sin(phiG);
  const c = Math.cos(phiG);

  // Schmidt semi-normalised associated Legendre functions P[n][m](sin phiG) and d/dphiG.
  const P: number[][] = [];
  const dP: number[][] = [];
  for (let n = 0; n <= N_MAX; n++) {
    P.push(new Array(n + 1).fill(0));
    dP.push(new Array(n + 1).fill(0));
  }
  P[0][0] = 1;
  for (let n = 1; n <= N_MAX; n++) {
    for (let m = 0; m <= n; m++) {
      if (n === m) {
        const k = n === 1 ? 1 : Math.sqrt(1 - 1 / (2 * n));
        P[n][n] = k * c * P[n - 1][n - 1];
        dP[n][n] = k * (c * dP[n - 1][n - 1] - x * P[n - 1][n - 1]);
      } else {
        const d = Math.sqrt(n * n - m * m);
        const k2 = n - 2 >= m ? Math.sqrt((n - 1) * (n - 1) - m * m) : 0;
        const p2 = n - 2 >= m ? P[n - 2][m] : 0;
        const dp2 = n - 2 >= m ? dP[n - 2][m] : 0;
        P[n][m] = ((2 * n - 1) * x * P[n - 1][m] - k2 * p2) / d;
        dP[n][m] = ((2 * n - 1) * (c * P[n - 1][m] + x * dP[n - 1][m]) - k2 * dp2) / d;
      }
    }
  }

  const dt = year - WMM_EPOCH;
  let bNorth = 0; // geocentric north (nT)
  let bEast = 0;
  let bDown = 0;
  for (const [n, m, g0, h0, gd, hd] of WMM_COEFFICIENTS) {
    const g = g0 + dt * gd;
    const h = h0 + dt * hd;
    const rr = Math.pow(A_REF_KM / r, n + 2);
    const cm = Math.cos(m * lam);
    const sm = Math.sin(m * lam);
    bNorth -= rr * (g * cm + h * sm) * dP[n][m];
    bEast += (rr * m * (g * sm - h * cm) * P[n][m]) / c;
    bDown -= rr * (n + 1) * (g * cm + h * sm) * P[n][m];
  }
  // Rotate from geocentric to geodetic.
  const psi = phiG - phi;
  const bX = bNorth * Math.cos(psi) - bDown * Math.sin(psi);
  return Math.atan2(bEast, bX) / RAD;
}

/** Declination for a Date (see {@link magneticDeclinationAtYear}). */
export function magneticDeclination(lat: number, lng: number, date: Date = new Date()): number {
  return magneticDeclinationAtYear(lat, lng, decimalYear(date));
}

/** UTM central meridian (degrees) of a zone. */
export function utmCentralMeridian(zone: number): number {
  return (zone - 1) * 6 - 180 + 3;
}

/**
 * Meridian convergence in degrees for a position in a UTM zone (first-order,
 * accurate to well under 0.01° inside the zone). Positive east of the central
 * meridian: grid north then lies east of true north.
 */
export function meridianConvergence(lat: number, lng: number, zone: number): number {
  return Math.atan(Math.tan((lng - utmCentralMeridian(zone)) * RAD) * Math.sin(lat * RAD)) / RAD;
}

/** "3,9° Ø" / "1,2° V" with Danish decimal comma. */
export function formatDeclination(deg: number, digits = 1): string {
  const abs = Math.abs(deg).toFixed(digits).replace(".", ",");
  return `${abs}° ${deg >= 0 ? "Ø" : "V"}`;
}
