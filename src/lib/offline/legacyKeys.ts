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

type TileCache = Pick<Cache, "match" | "put" | "delete">;

/**
 * Moves the tiles of saved areas from their old keys to the current ones.
 * Returns how many tiles moved. A layer whose first, middle and last old key
 * are all absent is skipped, so the common case (nothing to move) is cheap.
 */
export async function migrateLegacyTileKeys(areas: OfflineArea[], cache: TileCache): Promise<number> {
  let moved = 0;
  for (const area of areas) {
    const tiles = areaTiles(area.bounds);
    if (tiles.length === 0) continue;
    for (const id of area.layerIds) {
      const legacy = LEGACY_TILE_TEMPLATES[id];
      if (!legacy) continue;
      const oldKey = (i: number) => offlineCacheKey(expandTileUrl(legacy, tiles[i]));
      const sample = [0, Math.floor(tiles.length / 2), tiles.length - 1];
      const hits = await Promise.all(sample.map((i) => cache.match(oldKey(i))));
      if (hits.every((h) => !h)) continue;
      for (let i = 0; i < tiles.length; i++) {
        const key = oldKey(i);
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
