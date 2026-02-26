const EARTH_RADIUS = 6371008.8; // meters

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two [lng, lat] points in meters.
 */
function haversineDistance(
  a: [number, number],
  b: [number, number]
): number {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

/**
 * Total distance along a polyline of [lng, lat] coords, in meters.
 */
export function calculateDistance(coords: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(coords[i - 1], coords[i]);
  }
  return total;
}

/**
 * Geodesic area of a polygon ring of [lng, lat] coords, in m².
 * Uses the spherical excess formula.
 */
export function calculateArea(coords: [number, number][]): number {
  if (coords.length < 3) return 0;

  let total = 0;
  const n = coords.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const k = (i + 2) % n;

    const lam1 = toRad(coords[i][0]);
    const lam2 = toRad(coords[j][0]);
    const lam3 = toRad(coords[k][0]);
    const phi2 = toRad(coords[j][1]);

    total += (lam3 - lam1) * Math.sin(phi2);
  }

  return Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2);
}

/**
 * Format distance: "123 m", "1,2 km", etc.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} km`;
}

/**
 * Format area: "123 m²", "1,2 ha", "1,2 km²"
 */
export function formatArea(sqMeters: number): string {
  if (sqMeters < 10000) {
    return `${Math.round(sqMeters).toLocaleString("da-DK")} m²`;
  }
  if (sqMeters < 1000000) {
    return `${(sqMeters / 10000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} ha`;
  }
  return `${(sqMeters / 1000000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} km²`;
}
