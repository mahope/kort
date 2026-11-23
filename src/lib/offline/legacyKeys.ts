import type { OfflineArea } from "@/stores/offlineStore";
import { DATAFORSYNINGEN_TOKEN } from "@/lib/map/styles";
import { areaTiles, expandTileUrl, layerTileUrl, offlineCacheKey } from "./tiles";

/**
 * Areas saved before the tile route hold their tiles under the Dataforsyningen URLs the
 * app used then (token-free keys). The Danish layers now come from our own tile
 * route, and the cadastre from `wms/forvaltning2`, so those keys are never
 * asked for again. These are the old templates, byte for byte, so the old keys
 * can be found and moved to the new ones (same tiles, checked 23 Nov 2026).
 */
const WMS =
  "service=WMS&version=1.1.1&request=GetMap&SRS=EPSG:3857&WIDTH=256&HEIGHT=256";
const DHM = `https://api.dataforsyningen.dk/dhm_DAF?${WMS}&STYLES=&TRANSPARENT=TRUE&FORMAT=image/png&token=${DATAFORSYNINGEN_TOKEN}`;

function wms(service: string, layers: string): string {
  return (
    `https://api.dataforsyningen.dk/${service}?${WMS}&LAYERS=${layers}&STYLES=default` +
    `&TRANSPARENT=TRUE&FORMAT=image/png&token=${DATAFORSYNINGEN_TOKEN}&BBOX={bbox-epsg-3857}`
  );
}

export const LEGACY_TILE_TEMPLATES: Record<string, string> = {
  ortofoto:
    `https://api.dataforsyningen.dk/orto_foraar_webm_DAF?service=WMTS&request=GetTile&version=1.0.0` +
    `&layer=orto_foraar_webm&style=default&TileMatrixSet=DFD_GoogleMapsCompatible` +
    `&TileMatrix={z}&TileRow={y}&TileCol={x}&format=image/jpeg&token=${DATAFORSYNINGEN_TOKEN}`,
  // Saved areas used the screen variant (JPEG).
  dtk25: wms("dtk_25_DAF", "DTK25").replace("TRANSPARENT=TRUE&FORMAT=image/png", "TRANSPARENT=FALSE&FORMAT=image/jpeg"),
  historisk_hoeje: wms("topo20_hoeje_maalebordsblade_DAF", "dtk_hoeje_maalebordsblade"),
  historisk_lave: wms("topo20_lave_maalebordsblade_DAF", "dtk_lave_maalebordsblade"),
  stednavne: wms("danske_stednavne_DAF", "danske_stednavne"),
  matrikel: wms("forvaltning2_udv", "Matrikelskel"),
  contours: `${DHM}&LAYERS=dhm_kurve_0_5_m&BBOX={bbox-epsg-3857}`,
  contours25: `${DHM}&LAYERS=dhm_kurve_traditionel&BBOX={bbox-epsg-3857}`,
  hillshade: `${DHM}&LAYERS=dhm_terraen_skyggekort&BBOX={bbox-epsg-3857}`,
};

/**
 * Old-key urls of an area's tiles outside the layers' current bounds. Deleting
 * by the current urls finds the old key of every other tile (the service
 * worker maps each url to it), but these tiles have no current url. They stay
 * under the old key when the move stopped (storage full) before reaching them.
 */
export function legacyOutsideTileUrls(area: Pick<OfflineArea, "bounds" | "layerIds">): string[] {
  const tiles = areaTiles(area.bounds);
  const urls: string[] = [];
  for (const id of area.layerIds) {
    const legacy = LEGACY_TILE_TEMPLATES[id];
    if (!legacy) continue;
    for (const tile of tiles) {
      if (!layerTileUrl(id, tile)) urls.push(expandTileUrl(legacy, tile));
    }
  }
  return urls;
}

type TileCache = Pick<Cache, "match" | "put" | "delete" | "keys">;

/**
 * Moves the tiles of saved areas from their old keys to the current ones.
 * Returns how many tiles moved. Every old key is checked against one listing
 * of the cache, so partial downloads move completely. Throws if the cache
 * refuses a write (quota): the old tiles stay, and the next load tries again.
 */
export async function migrateLegacyTileKeys(areas: OfflineArea[], cache: TileCache): Promise<number> {
  const present = new Set((await cache.keys()).map((r) => r.url));
  let moved = 0;
  for (const area of areas) {
    const tiles = areaTiles(area.bounds);
    for (const id of area.layerIds) {
      const legacy = LEGACY_TILE_TEMPLATES[id];
      if (!legacy) continue;
      for (let i = 0; i < tiles.length; i++) {
        const key = offlineCacheKey(expandTileUrl(legacy, tiles[i]));
        if (!present.has(key)) continue;
        const saved = await cache.match(key);
        if (!saved) continue;
        const url = layerTileUrl(id, tiles[i]);
        if (url) {
          const newKey = offlineCacheKey(url);
          if (!(await cache.match(newKey))) await cache.put(newKey, saved);
          moved++;
        }
        await cache.delete(key);
      }
    }
  }
  return moved;
}
