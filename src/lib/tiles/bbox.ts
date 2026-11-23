/** Web Mercator tile maths shared by the tile route and the offline cache. */

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

const EPSG3857_RADIUS = 6378137;
const EXTENT_AT_ZOOM0 = 2 * Math.PI * EPSG3857_RADIUS;
const ORIGIN_X = -Math.PI * EPSG3857_RADIUS;
const ORIGIN_Y = Math.PI * EPSG3857_RADIUS;

/** Same number formatting as MapLibre's `{bbox-epsg-3857}`, so cache keys match. */
export function tileBBox3857({ z, x, y }: TileCoord): string {
  const tilesAtZoom = 2 ** z;
  const tileExtent = EXTENT_AT_ZOOM0 / tilesAtZoom;
  const gridMinY = ORIGIN_Y - EXTENT_AT_ZOOM0;
  const rowFromBottom = tilesAtZoom - y - 1;
  return `${ORIGIN_X + x * tileExtent},${gridMinY + rowFromBottom * tileExtent},${ORIGIN_X + (x + 1) * tileExtent},${gridMinY + (rowFromBottom + 1) * tileExtent}`;
}

function tileLng(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}

function tileLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}

/** True when the tile overlaps [west, south, east, north] (degrees). */
export function tileIntersects({ z, x, y }: TileCoord, [west, south, east, north]: [number, number, number, number]): boolean {
  const w = tileLng(x, z);
  const e = tileLng(x + 1, z);
  const n = tileLat(y, z);
  const s = tileLat(y + 1, z);
  return w < east && e > west && s < north && n > south;
}
