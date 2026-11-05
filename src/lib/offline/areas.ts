import type { OfflineArea } from "@/stores/offlineStore";
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
