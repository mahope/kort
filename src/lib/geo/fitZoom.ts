/** Earth circumference at the equator in metres (Web Mercator sphere). */
const EARTH_CIRCUMFERENCE_M = 40075016.686;
/** MapLibre renders 512 px tiles: zoom z covers the world in 512 * 2^z px. */
const WORLD_TILE_PX = 512;

/**
 * Zoom at which a ground area of widthM x heightM (true metres) fits inside a
 * viewport of viewportW x viewportH CSS px at the given latitude, leaving
 * `fill` (0-1) of the smaller dimension used so the frame edges stay visible.
 */
export function zoomToFitGround(
  widthM: number,
  heightM: number,
  viewportW: number,
  viewportH: number,
  lat: number,
  { fill = 0.85, minZoom = 5, maxZoom = 17 }: { fill?: number; minZoom?: number; maxZoom?: number } = {}
): number {
  if (widthM <= 0 || heightM <= 0 || viewportW <= 0 || viewportH <= 0) return maxZoom;
  // Metres per pixel that make the area fill the limiting viewport dimension.
  const mpp = Math.max(widthM / (viewportW * fill), heightM / (viewportH * fill));
  const zoom = Math.log2((EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / (WORLD_TILE_PX * mpp));
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}
