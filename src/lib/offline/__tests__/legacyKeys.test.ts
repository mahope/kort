import { afterEach, describe, expect, it, vi } from "vitest";
import { LEGACY_TILE_TEMPLATES, migrateLegacyTileKeys } from "../legacyKeys";
import { findMissingAreas } from "../areas";
import { areaTiles, areaTileUrls, expandTileUrl, layerTileUrl, offlineCacheKey } from "../tiles";
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
    keys: async () => [...store.keys()].map((k) => new Request(k)),
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

  it("move every old tile of a partial download, not only sampled ones", async () => {
    const a = area("p", mols, ["dtk25"]);
    const cache = savedBeforeRoute(a);
    const tiles = areaTiles(a.bounds);
    const oldKey = (i: number) => offlineCacheKey(expandTileUrl(LEGACY_TILE_TEMPLATES.dtk25, tiles[i]));
    // First, middle and last tile never finished downloading.
    for (const i of [0, Math.floor(tiles.length / 2), tiles.length - 1]) cache.store.delete(oldKey(i));
    const left = cache.store.size;
    expect(await migrateLegacyTileKeys([a], cache)).toBe(left);
    expect([...cache.store.keys()].some((k) => k.includes("_DAF"))).toBe(false);
    expect(cache.store.has(offlineCacheKey(layerTileUrl("dtk25", tiles[1])!))).toBe(true);
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

  it("keeps the area and the old tiles when the browser's storage is full", async () => {
    const a = area("a", mols, ["dtk25"]);
    const cache = savedBeforeRoute(a);
    const before = cache.store.size;
    cache.put = async () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    vi.stubGlobal("caches", { open: async () => cache });

    vi.resetModules();
    const mod = await import("../areas");
    const { useOfflineStore: store } = await import("@/stores/offlineStore");
    store.setState({ areas: [a] });
    expect(await mod.ensureOfflineKeysMigrated()).toBe(false);
    expect(await mod.dropEvictedAreas()).toEqual([]);
    expect(store.getState().areas.map((x) => x.id)).toEqual(["a"]);
    expect(localStorage.getItem("offline-tile-keys")).toBeNull();
    expect(cache.store.size).toBe(before);
  });

  it("keeps a partial download whose first, middle and last tile never arrived", async () => {
    const a = area("p", mols, ["dtk25"]);
    const cache = savedBeforeRoute(a);
    const tiles = areaTiles(a.bounds);
    for (const i of [0, Math.floor(tiles.length / 2), tiles.length - 1]) {
      cache.store.delete(offlineCacheKey(expandTileUrl(LEGACY_TILE_TEMPLATES.dtk25, tiles[i])));
    }
    vi.stubGlobal("caches", { open: async () => cache });

    vi.resetModules();
    const mod = await import("../areas");
    const { useOfflineStore: store } = await import("@/stores/offlineStore");
    store.setState({ areas: [a] });
    expect(await mod.dropEvictedAreas()).toEqual([]);
    expect(store.getState().areas.map((x) => x.id)).toEqual(["p"]);
  });
});
