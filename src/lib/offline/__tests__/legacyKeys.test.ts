import { afterEach, describe, expect, it, vi } from "vitest";
import { LEGACY_TILE_TEMPLATES, migrateLegacyTileKeys } from "../legacyKeys";
import { findMissingAreas } from "../areas";
import { areaTiles, areaTileUrls, expandTileUrl, offlineCacheKey } from "../tiles";
import { useOfflineStore, type OfflineArea } from "@/stores/offlineStore";

const mols = { north: 56.22, south: 56.21, east: 10.57, west: 10.56 };
// Across 54.3° N south of Gedser: part of it is outside the route's bounds.
const gedser = { north: 54.32, south: 54.28, east: 11.98, west: 11.95 };
const area = (id: string, bounds: OfflineArea["bounds"], layerIds: string[]): OfflineArea => ({
  id,
  createdAt: 0,
  bounds,
  layerIds,
  tileCount: 1,
  bytes: 1,
});

function memoryCache() {
  const store = new Map<string, Response>();
  return {
    store,
    match: async (k: RequestInfo | URL) => store.get(String(k)),
    put: async (k: RequestInfo | URL, r: Response) => void store.set(String(k), r),
    delete: async (k: RequestInfo | URL) => store.delete(String(k)),
  };
}

/** The cache as the previous release left it: every tile under its old Dataforsyningen key. */
function savedBeforeRoute(a: OfflineArea) {
  const cache = memoryCache();
  for (const id of a.layerIds) {
    for (const t of areaTiles(a.bounds)) {
      cache.store.set(offlineCacheKey(expandTileUrl(LEGACY_TILE_TEMPLATES[id], t)), new Response("img"));
    }
  }
  return cache;
}

describe("saved areas from before the tile route", () => {
  const layers = ["dtk25", "ortofoto", "matrikel", "hillshade"];

  it("look evicted without the migration", async () => {
    const a = area("a", mols, layers);
    expect(await findMissingAreas([a], savedBeforeRoute(a))).toEqual(["a"]);
  });

  it("keep every tile under the current key after it", async () => {
    const a = area("a", mols, layers);
    const cache = savedBeforeRoute(a);
    const before = cache.store.size;
    expect(await migrateLegacyTileKeys([a], cache)).toBe(before);
    const urls = areaTileUrls(a.bounds, a.layerIds);
    expect(cache.store.size).toBe(urls.length);
    for (const u of urls) expect(cache.store.has(offlineCacheKey(u))).toBe(true);
    expect([...cache.store.keys()].some((k) => k.includes("_DAF") || k.includes("forvaltning2_udv"))).toBe(false);
    expect(await findMissingAreas([a], cache)).toEqual([]);
  });

  it("drop old tiles the route would refuse instead of moving them", async () => {
    const a = area("g", gedser, ["dtk25"]);
    const cache = savedBeforeRoute(a);
    const kept = areaTileUrls(a.bounds, a.layerIds).length;
    expect(kept).toBeLessThan(cache.store.size);
    expect(await migrateLegacyTileKeys([a], cache)).toBe(kept);
    expect(cache.store.size).toBe(kept);
  });

  it("leave a cache without old keys untouched", async () => {
    const cache = memoryCache();
    const [u] = areaTileUrls(mols, ["dtk25"]);
    cache.store.set(offlineCacheKey(u), new Response("img"));
    expect(await migrateLegacyTileKeys([area("a", mols, ["dtk25"])], cache)).toBe(0);
    expect(cache.store.size).toBe(1);
  });
});

describe("ensureOfflineKeysMigrated", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    useOfflineStore.setState({ areas: [] });
  });

  it("migrates once per browser and remembers it", async () => {
    const a = area("a", mols, ["dtk25"]);
    useOfflineStore.setState({ areas: [a] });
    const cache = savedBeforeRoute(a);
    const open = vi.fn(async () => cache);
    vi.stubGlobal("caches", { open });

    vi.resetModules();
    const first = await import("../areas");
    await first.ensureOfflineKeysMigrated();
    expect(await findMissingAreas([a], cache)).toEqual([]);
    expect(open).toHaveBeenCalledTimes(1);

    // A new page load: the flag says it is done.
    vi.resetModules();
    const second = await import("../areas");
    await second.ensureOfflineKeysMigrated();
    expect(open).toHaveBeenCalledTimes(1);
  });
});
