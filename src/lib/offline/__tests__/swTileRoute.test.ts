// @vitest-environment node
// Node, not jsdom: the worker builds Responses from Blobs, which jsdom's Blob breaks.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { LEGACY_TILE_TEMPLATES, legacyOutsideTileUrls } from "../legacyKeys";
import { OFFLINE_CACHE_NAME } from "../areas";
import { areaTiles, expandTileUrl, layerTileUrl, offlineCacheKey } from "../tiles";
import { DTK25_TILES_URL } from "@/lib/map/sources";

// Runs public/sw.js against fake Cache Storage and network, to check that
// tiles from our own route (/api/tiles, same-origin) are cached like the
// Dataforsyningen tiles were and still show with the network off.

const ORIGIN = "https://kort.example";
const TILE = `${ORIGIN}/api/tiles/dtk25/14/8672/5084.jpg`;
const mols = { north: 56.22, south: 56.21, east: 10.57, west: 10.56 };

type Handler = (event: unknown) => void;

function keyOf(req: string | Request): string {
  return typeof req === "string" ? new URL(req, ORIGIN).href : req.url;
}

type MatchHook = (key: string, store: Map<string, Response>) => void;

function fakeCaches(opts: { full?: boolean; beforeMatch?: MatchHook } = {}) {
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name)!;
    return {
      match: async (req: string | Request) => {
        opts.beforeMatch?.(keyOf(req), m);
        return m.get(keyOf(req))?.clone();
      },
      put: async (req: string | Request, res: Response) => {
        if (opts.full) throw new DOMException("quota", "QuotaExceededError");
        m.set(keyOf(req), res);
      },
      delete: async (req: string | Request) => m.delete(keyOf(req)),
      keys: async () => [...m.keys()].map((u) => new Request(u)),
      add: async () => {},
    };
  };
  return {
    stores,
    api: {
      open,
      keys: async () => [...stores.keys()],
      delete: async (n: string) => stores.delete(n),
      match: async (req: string | Request) => {
        for (const m of stores.values()) {
          const hit = m.get(keyOf(req));
          if (hit) return hit.clone();
        }
        return undefined;
      },
    },
  };
}

function loadWorker(
  network: { online: boolean },
  opts: { full?: boolean; origin?: string; beforeMatch?: MatchHook; respond?: (url: string) => Response | undefined } = {}
) {
  const handlers: Record<string, Handler> = {};
  const caches = fakeCaches(opts);
  const fetchFn = async (input: string | Request) => {
    if (!network.online) throw new TypeError("offline");
    const own = opts.respond?.(typeof input === "string" ? input : input.url);
    if (own) return own;
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } });
  };
  const self = {
    location: new URL(`${opts.origin ?? ORIGIN}/sw.js`),
    addEventListener: (type: string, fn: Handler) => (handlers[type] = fn),
    skipWaiting: () => {},
    clients: { claim: () => {} },
  };
  const src = readFileSync("public/sw.js", "utf8");
  new Function("self", "caches", "fetch", "navigator", src)(self, caches.api, fetchFn, { onLine: network.online });

  async function request(url: string, headers?: Record<string, string>): Promise<Response | undefined> {
    let responded: Promise<Response> | undefined;
    const pending: Promise<unknown>[] = [];
    handlers.fetch({
      request: new Request(url, { headers }),
      respondWith: (p: Promise<Response>) => (responded = p),
      waitUntil: (p: Promise<unknown>) => pending.push(p),
    });
    const res = await responded;
    await Promise.all(pending);
    return res;
  }

  async function message(data: unknown): Promise<unknown> {
    let reply: unknown;
    const pending: Promise<unknown>[] = [];
    handlers.message({
      data,
      ports: [{ postMessage: (r: unknown) => (reply = r) }],
      waitUntil: (p: Promise<unknown>) => pending.push(p),
    });
    await Promise.all(pending);
    return reply;
  }

  return { request, message, caches };
}

describe("service worker and the tile route", () => {
  const network = { online: true };
  beforeEach(() => {
    network.online = true;
  });

  it("caches a route tile seen on screen and serves it offline", async () => {
    const sw = loadWorker(network);
    const first = await sw.request(TILE);
    expect(first?.status).toBe(200);
    network.online = false;
    const again = await sw.request(TILE);
    expect(again?.status).toBe(200);
    expect(again?.headers.get("content-type")).toBe("image/jpeg");
  });

  it("saves route tiles for an offline area and serves them with the network off", async () => {
    const sw = loadWorker(network);
    const reply = (await sw.message({ type: "OFFLINE_FETCH", urls: [TILE] })) as { stored: unknown[]; failed: unknown[] };
    expect(reply.stored).toHaveLength(1);
    expect(reply.failed).toHaveLength(0);
    network.online = false;
    expect((await sw.request(TILE))?.status).toBe(200);
  });

  it("still shows a fetched tile when the cache is full", async () => {
    const sw = loadWorker(network, { full: true });
    const res = await sw.request(TILE);
    expect(res?.status).toBe(200);
    expect(res?.headers.get("content-type")).toBe("image/jpeg");
  });

  it("serves a saved tile still under its old key while the migration runs", async () => {
    const tiles = areaTiles(mols);
    const sample = [tiles[0], tiles[Math.floor(tiles.length / 2)], tiles[tiles.length - 1]];
    for (const id of Object.keys(LEGACY_TILE_TEMPLATES)) {
      for (const t of sample) {
        const url = layerTileUrl(id, t)!;
        const sw = loadWorker(network, { origin: new URL(url).origin });
        const offline = await sw.caches.api.open(OFFLINE_CACHE_NAME);
        await offline.put(offlineCacheKey(expandTileUrl(LEGACY_TILE_TEMPLATES[id], t)), new Response("old"));
        network.online = false;
        const res = await sw.request(url);
        expect(res?.status, `${id} ${url}`).toBe(200);
        expect(await res?.text()).toBe("old");
        network.online = true;
      }
    }
  });

  it("does not serve an old JPEG screen tile for the PDF's PNG", async () => {
    const t = areaTiles(mols)[0];
    const png = expandTileUrl(DTK25_TILES_URL, t);
    const sw = loadWorker(network, { origin: new URL(png).origin });
    const offline = await sw.caches.api.open(OFFLINE_CACHE_NAME);
    await offline.put(offlineCacheKey(expandTileUrl(LEGACY_TILE_TEMPLATES.dtk25, t)), new Response("old"));
    network.online = false;
    expect((await sw.request(png))?.status).toBe(503);
  });

  it("finds a tile the migration moves between the two lookups", async () => {
    const t = areaTiles(mols)[0];
    const url = layerTileUrl("dtk25", t)!;
    const newKey = offlineCacheKey(url);
    const oldKey = offlineCacheKey(expandTileUrl(LEGACY_TILE_TEMPLATES.dtk25, t));
    // The page moves the tile right after the worker missed the new key.
    const sw = loadWorker(network, {
      origin: new URL(url).origin,
      beforeMatch: (key, store) => {
        if (key !== oldKey || !store.has(oldKey)) return;
        store.set(newKey, store.get(oldKey)!);
        store.delete(oldKey);
      },
    });
    const offline = await sw.caches.api.open(OFFLINE_CACHE_NAME);
    await offline.put(oldKey, new Response("old"));
    network.online = false;
    const res = await sw.request(url);
    expect(res?.status).toBe(200);
    expect(await res?.text()).toBe("old");
  });

  it("deletes a saved tile still under its old key with its area", async () => {
    const t = areaTiles(mols)[0];
    const url = layerTileUrl("dtk25", t)!;
    const oldKey = offlineCacheKey(expandTileUrl(LEGACY_TILE_TEMPLATES.dtk25, t));
    const sw = loadWorker(network, { origin: new URL(url).origin });
    const offline = await sw.caches.api.open(OFFLINE_CACHE_NAME);
    await offline.put(oldKey, new Response("old"));
    await sw.message({ type: "OFFLINE_DELETE", urls: [url] });
    expect(await offline.match(oldKey)).toBeUndefined();
    network.online = false;
    expect((await sw.request(url))?.status).toBe(503);
  });

  it("deletes old-key tiles outside the route's bounds with their area", async () => {
    // Across 54.3° N south of Gedser: the move stopped (storage full) before
    // dropping these, and they have no current url to reach them by.
    const a = { bounds: { north: 54.32, south: 54.28, east: 11.98, west: 11.95 }, layerIds: ["dtk25"] };
    const outside = legacyOutsideTileUrls(a);
    expect(outside.length).toBeGreaterThan(0);
    const sw = loadWorker(network);
    const offline = await sw.caches.api.open(OFFLINE_CACHE_NAME);
    for (const u of outside) await offline.put(offlineCacheKey(u), new Response("old"));
    await sw.message({ type: "OFFLINE_DELETE", urls: outside });
    for (const u of outside) expect(await offline.match(offlineCacheKey(u))).toBeUndefined();
  });

  it("does not bulk-fetch other same-origin paths or foreign hosts", async () => {
    const sw = loadWorker(network);
    const reply = (await sw.message({
      type: "OFFLINE_FETCH",
      urls: [`${ORIGIN}/api/stednavne?q=x`, "https://tile.openstreetmap.org/1/1/1.png", "https://evil.example/api/tiles/dtk25/1/1/1.png"],
    })) as { stored: unknown[] };
    expect(reply.stored).toHaveLength(0);
  });
});

describe("service worker and the saved søkort file", () => {
  const FILE = "https://tiles.mahoje.dk/soekort.pmtiles";
  // The PMTiles v3 header ("PMTiles", version 3), then two more bytes.
  const BYTES = new Uint8Array([...new TextEncoder().encode("PMTiles"), 3, 8, 9]);
  const network = { online: true };
  const respond = (url: string) =>
    url === FILE
      ? new Response(BYTES, { status: 200, headers: { "content-type": "application/octet-stream", etag: '"v1"' } })
      : undefined;
  beforeEach(() => {
    network.online = true;
  });

  it("saves the whole file and answers the map's range requests from it offline", async () => {
    const sw = loadWorker(network, { respond });
    const reply = (await sw.message({ type: "OFFLINE_FETCH", urls: [FILE] })) as { stored: { bytes: number }[] };
    expect(reply.stored).toEqual([{ url: FILE, bytes: 10 }]);
    network.online = false;
    const res = await sw.request(FILE, { range: "bytes=2-5" });
    expect(res?.status).toBe(206);
    expect(res?.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(res?.headers.get("etag")).toBe('"v1"');
    expect([...new Uint8Array(await res!.arrayBuffer())]).toEqual([...BYTES.subarray(2, 6)]);
    // A range past the end is cut to the file, as the file server does.
    const tail = await sw.request(FILE, { range: "bytes=8-100" });
    expect([...new Uint8Array(await tail!.arrayBuffer())]).toEqual([8, 9]);
    expect((await sw.request(FILE, { range: "bytes=20-30" }))?.status).toBe(416);
  });

  it("goes to the network while the file is not saved, and stores nothing", async () => {
    const sw = loadWorker(network, { respond });
    expect((await sw.request(FILE, { range: "bytes=0-3" }))?.status).toBe(200);
    const offline = await sw.caches.api.open(OFFLINE_CACHE_NAME);
    expect(await offline.keys()).toEqual([]);
  });

  it("deletes the saved file with its area", async () => {
    const sw = loadWorker(network, { respond });
    await sw.message({ type: "OFFLINE_FETCH", urls: [FILE] });
    await sw.message({ type: "OFFLINE_DELETE", urls: [FILE] });
    network.online = false;
    await expect(sw.request(FILE, { range: "bytes=0-3" })).rejects.toThrow("offline");
  });

  it("saves no error page the host sends with status 200", async () => {
    const page = () => new Response("<html>502 Bad Gateway</html>", { status: 200, headers: { "content-type": "text/html" } });
    const sw = loadWorker(network, { respond: (url) => (url === FILE ? page() : undefined) });
    const reply = (await sw.message({ type: "OFFLINE_FETCH", urls: [FILE] })) as { stored: unknown[]; failed: string[] };
    expect(reply.stored).toEqual([]);
    expect(reply.failed).toEqual([FILE]);
    const offline = await sw.caches.api.open(OFFLINE_CACHE_NAME);
    expect(await offline.keys()).toEqual([]);
  });

  it("saves no PMTiles file from other hosts", async () => {
    const other = "https://example.org/soekort.pmtiles";
    const sw = loadWorker(network, { respond: () => new Response(BYTES, { status: 200 }) });
    const reply = (await sw.message({ type: "OFFLINE_FETCH", urls: [other] })) as { stored: unknown[] };
    expect(reply.stored).toEqual([]);
  });
});
