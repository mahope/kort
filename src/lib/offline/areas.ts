import { useOfflineStore, type OfflineArea } from "@/stores/offlineStore";
import { migrateLegacyTileKeys } from "./legacyKeys";
import { areaTileUrls, offlineCacheKey } from "./tiles";

/**
 * Cache holding saved tiles; keep identical to OFFLINE_CACHE in public/sw.js.
 * v2: keys are token-free. The service worker deletes unknown caches on
 * activate, so the token-keyed v1 entries do not linger as orphans.
 */
export const OFFLINE_CACHE_NAME = "topoprint-offline-v2";

/**
 * Ids of saved areas whose tiles the browser has evicted or cleared: first,
 * middle and last tile are all missing. Areas without any tile url cannot be
 * checked and are left alone.
 */
export async function findMissingAreas(
  areas: OfflineArea[],
  cache: { match: (key: string) => Promise<unknown> }
): Promise<string[]> {
  const missing: string[] = [];
  for (const area of areas) {
    const urls = areaTileUrls(area.bounds, area.layerIds);
    if (urls.length === 0) continue;
    const sample = [urls[0], urls[Math.floor(urls.length / 2)], urls[urls.length - 1]];
    const hits = await Promise.all(sample.map((u) => cache.match(offlineCacheKey(u))));
    if (hits.every((h) => !h)) missing.push(area.id);
  }
  return missing;
}

/** Set once the saved tiles sit under the tile-route keys (see legacyKeys.ts). */
const KEYS_MIGRATED_FLAG = "offline-tile-keys";
const KEYS_MIGRATED_VALUE = "tile-route";
let migration: Promise<boolean> | null = null;

/**
 * Moves areas saved before the tile route to the new keys, once per browser.
 * Resolves true once the saved tiles sit under the current keys, false if the
 * move failed (e.g. storage full); then the flag stays unset and the next load
 * tries again. Until then the service worker falls back to the old keys.
 */
export function ensureOfflineKeysMigrated(): Promise<boolean> {
  migration ??= (async () => {
    if (typeof caches === "undefined" || typeof localStorage === "undefined") return false;
    if (localStorage.getItem(KEYS_MIGRATED_FLAG) === KEYS_MIGRATED_VALUE) return true;
    const areas = useOfflineStore.getState().areas;
    if (areas.length > 0) await migrateLegacyTileKeys(areas, await caches.open(OFFLINE_CACHE_NAME));
    localStorage.setItem(KEYS_MIGRATED_FLAG, KEYS_MIGRATED_VALUE);
    return true;
  })().catch(() => {
    migration = null;
    return false;
  });
  return migration;
}

/**
 * Removes saved areas whose tiles the browser has evicted, and returns their
 * ids. Does nothing until the key migration has succeeded: before that, areas
 * saved under the old keys would look evicted.
 */
export async function dropEvictedAreas(): Promise<string[]> {
  if (!(await ensureOfflineKeysMigrated())) return [];
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const { areas, removeArea } = useOfflineStore.getState();
  const missing = await findMissingAreas(areas, cache);
  for (const id of missing) removeArea(id);
  return missing;
}
