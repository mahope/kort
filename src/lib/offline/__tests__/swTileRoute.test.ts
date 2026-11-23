import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

// Runs public/sw.js against fake Cache Storage and network, to check that
// tiles from our own route (/api/tiles, same-origin) are cached like the
// Dataforsyningen tiles were and still show with the network off.

const ORIGIN = "https://kort.example";
const TILE = `${ORIGIN}/api/tiles/dtk25/14/8672/5084.jpg`;

type Handler = (event: unknown) => void;

function keyOf(req: string | Request): string {
  return typeof req === "string" ? new URL(req, ORIGIN).href : req.url;
}

function fakeCaches(opts: { full?: boolean } = {}) {
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name)!;
    return {
      match: async (req: string | Request) => m.get(keyOf(req))?.clone(),
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

function loadWorker(network: { online: boolean }, opts: { full?: boolean } = {}) {
  const handlers: Record<string, Handler> = {};
  const caches = fakeCaches(opts);
  const fetchFn = async (input: string | Request) => {
    if (!network.online) throw new TypeError("offline");
    void input;
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } });
  };
  const self = {
    location: new URL(`${ORIGIN}/sw.js`),
    addEventListener: (type: string, fn: Handler) => (handlers[type] = fn),
    skipWaiting: () => {},
    clients: { claim: () => {} },
  };
  const src = readFileSync("public/sw.js", "utf8");
  new Function("self", "caches", "fetch", "navigator", src)(self, caches.api, fetchFn, { onLine: network.online });

  async function request(url: string): Promise<Response | undefined> {
    let responded: Promise<Response> | undefined;
    const pending: Promise<unknown>[] = [];
    handlers.fetch({
      request: new Request(url),
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

  it("does not bulk-fetch other same-origin paths or foreign hosts", async () => {
    const sw = loadWorker(network);
    const reply = (await sw.message({
      type: "OFFLINE_FETCH",
      urls: [`${ORIGIN}/api/stednavne?q=x`, "https://tile.openstreetmap.org/1/1/1.png", "https://evil.example/api/tiles/dtk25/1/1/1.png"],
    })) as { stored: unknown[] };
    expect(reply.stored).toHaveLength(0);
  });
});
