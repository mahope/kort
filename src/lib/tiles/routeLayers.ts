/**
 * The Danish raster layers the browser fetches through our own tile route
 * (`/api/tiles/<layer>/<z>/<x>/<y>.<ext>`, src/app/api/tiles). The route adds
 * the Datafordeler API key on the server, so the key never reaches the client.
 * This file holds no secrets and is shared by client and server.
 */

export const TILE_ROUTE_LAYERS = [
  "dtk25",
  "ortofoto",
  "historisk_hoeje",
  "historisk_lave",
  "stednavne",
  "contours",
  "contours25",
  "hillshade",
] as const;

export type TileRouteLayer = (typeof TILE_ROUTE_LAYERS)[number];
export type TileFormat = "png" | "jpg";

/** Formats each layer may be asked for: DTK25 is JPEG on screen and PNG in the PDF. */
export const TILE_ROUTE_FORMATS: Record<TileRouteLayer, readonly TileFormat[]> = {
  dtk25: ["png", "jpg"],
  ortofoto: ["jpg"],
  historisk_hoeje: ["png"],
  historisk_lave: ["png"],
  stednavne: ["png"],
  contours: ["png"],
  contours25: ["png"],
  hillshade: ["png"],
};

/**
 * Denmark with Bornholm, Ertholmene and a margin for padded offline areas
 * ([west, south, east, north]). MapLibre asks for no tiles outside it, and the
 * route refuses them.
 */
export const DENMARK_TILE_BOUNDS: [number, number, number, number] = [7.5, 54.3, 15.7, 58.1];

/** Highest tile zoom the route serves (MapLibre's own ceiling). */
export const TILE_ROUTE_MAX_ZOOM = 22;

export const TILE_ROUTE_PATH = "/api/tiles";

export function isTileRouteLayer(value: string): value is TileRouteLayer {
  return (TILE_ROUTE_LAYERS as readonly string[]).includes(value);
}

/**
 * Absolute tile template for a layer. MapLibre, the offline cache key and the
 * service worker all need absolute URLs; `origin` is the page's own origin.
 */
export function tileRouteTemplate(origin: string, layer: TileRouteLayer, format: TileFormat): string {
  return `${origin}${TILE_ROUTE_PATH}/${layer}/{z}/{x}/{y}.${format}`;
}
