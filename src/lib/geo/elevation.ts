import { calculateDistance } from "./measure";

export interface ElevationPoint {
  /** Cumulative 2D distance from the start, in metres. */
  dist: number;
  /** Elevation in metres. */
  ele: number;
}

export interface ElevationProfileData {
  points: ElevationPoint[];
  distanceM: number;
  minEle: number;
  maxEle: number;
  ascentM: number;
  descentM: number;
}

/**
 * Build an elevation profile from a line's coordinates. GPX tracks carry the
 * elevation as the 3rd coordinate value ([lng, lat, ele]); returns null when
 * fewer than two points carry elevation data.
 */
export function extractElevationProfile(
  coords: number[][]
): ElevationProfileData | null {
  const pts = coords.filter((c) => c.length >= 3 && typeof c[2] === "number");
  if (pts.length < 2) return null;

  const points: ElevationPoint[] = [];
  let dist = 0;
  let ascent = 0;
  let descent = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;

  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      dist += calculateDistance([
        [pts[i - 1][0], pts[i - 1][1]],
        [pts[i][0], pts[i][1]],
      ]);
      const dz = pts[i][2] - pts[i - 1][2];
      if (dz > 0) ascent += dz;
      else descent += -dz;
    }
    const ele = pts[i][2];
    minEle = Math.min(minEle, ele);
    maxEle = Math.max(maxEle, ele);
    points.push({ dist, ele });
  }

  return { points, distanceM: dist, minEle, maxEle, ascentM: ascent, descentM: descent };
}

/** Extract line coordinate rings (Line/MultiLine) from a GeoJSON geometry. */
export function lineStringsOf(geom: GeoJSON.Geometry): number[][][] {
  if (geom.type === "LineString") return [geom.coordinates];
  if (geom.type === "MultiLineString") return geom.coordinates;
  return [];
}
