import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

// A fake key: the route must put it on the upstream request and nowhere else.
const KEY = "test-dafo-key-not-real";
// Mols Bjerge at zoom 14.
const MOLS = { z: "14", x: "8672", y: "5084" };

let ipCounter = 0;
function call(layer: string, z: string, x: string, y: string, { search = "", ip }: { search?: string; ip?: string } = {}) {
  const url = new URL(`http://localhost/api/tiles/${layer}/${z}/${x}/${y}${search}`);
  const req = new NextRequest(url, { headers: { "x-forwarded-for": ip ?? `203.0.113.${++ipCounter % 250}` } });
  return GET(req, { params: Promise.resolve({ layer, z, x, y }) });
}

function image(type = "image/png", bytes = 123) {
  return new Response(new Uint8Array(bytes), { status: 200, headers: { "content-type": type } });
}

const fetchMock = vi.fn();
const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

beforeEach(() => {
  fetchMock.mockReset();
  warn.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("DATAFORDELER_API_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function expectNoKeyLeak(res: Response) {
  const text = await res.clone().text();
  expect(text).not.toContain(KEY);
  expect(text).not.toContain("datafordeler.dk");
  for (const [, value] of res.headers) expect(value).not.toContain(KEY);
  for (const args of warn.mock.calls) expect(String(args.join(" "))).not.toContain(KEY);
}

describe("GET /api/tiles/[layer]/[z]/[x]/[y]", () => {
  it("fetches DTK25 from Datafordeleren with the key and caches the answer", async () => {
    fetchMock.mockResolvedValue(image("image/png", 321));
    const res = await call("dtk25", MOLS.z, MOLS.x, `${MOLS.y}.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toMatch(/public, max-age=\d{6,}.*stale-while-revalidate=\d+/);
    expect(res.headers.get("x-tile-source")).toBe("datafordeler");
    expect((await res.clone().arrayBuffer()).byteLength).toBe(321);

    const upstream = new URL(fetchMock.mock.calls[0][0]);
    expect(upstream.origin).toBe("https://wms.datafordeler.dk");
    expect(upstream.pathname).toBe("/DKtopokort/dtk_25/1.0.0/WMS");
    expect(upstream.searchParams.get("apikey")).toBe(KEY);
    expect(upstream.searchParams.get("token")).toBeNull();
    expect(upstream.searchParams.get("SRS")).toBe("EPSG:3857");
    expect(upstream.searchParams.get("WIDTH")).toBe("256");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "error" });
    await expectNoKeyLeak(res);
  });

  it("serves the screen JPEG of DTK25 and the orthophoto from WMTS", async () => {
    fetchMock.mockImplementation(async () => image("image/jpeg"));
    expect((await call("dtk25", MOLS.z, MOLS.x, `${MOLS.y}.jpg`)).status).toBe(200);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("FORMAT")).toBe("image/jpeg");
    const res = await call("ortofoto", MOLS.z, MOLS.x, `${MOLS.y}.jpg`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    const wmts = new URL(fetchMock.mock.calls[1][0]);
    expect(wmts.hostname).toBe("wmts.datafordeler.dk");
    expect(wmts.searchParams.get("TileMatrix")).toBe("14");
    expect(wmts.searchParams.get("TileCol")).toBe("8672");
    expect(wmts.searchParams.get("TileRow")).toBe("5084");
  });

  it("falls back to Dataforsyningen with the public token when no key is set", async () => {
    vi.stubEnv("DATAFORDELER_API_KEY", "");
    fetchMock.mockResolvedValue(image());
    const res = await call("hillshade", MOLS.z, MOLS.x, `${MOLS.y}.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-tile-source")).toBe("dataforsyningen");
    const upstream = new URL(fetchMock.mock.calls[0][0]);
    expect(upstream.origin).toBe("https://api.dataforsyningen.dk");
    expect(upstream.pathname).toBe("/dhm_DAF");
    expect(upstream.searchParams.get("token")).toBeTruthy();
    expect(upstream.searchParams.get("apikey")).toBeNull();
  });

  it.each([
    ["unknown layer", ["matrikel", MOLS.z, MOLS.x, `${MOLS.y}.png`], 404],
    ["another host smuggled in as layer", ["wms.example.com", MOLS.z, MOLS.x, `${MOLS.y}.png`], 404],
    ["format the layer lacks", ["ortofoto", MOLS.z, MOLS.x, `${MOLS.y}.png`], 400],
    ["unknown format", ["dtk25", MOLS.z, MOLS.x, `${MOLS.y}.gif`], 400],
    ["no format", ["dtk25", MOLS.z, MOLS.x, MOLS.y], 400],
    ["non-numeric zoom", ["dtk25", "x", MOLS.x, `${MOLS.y}.png`], 400],
    ["leading zeros", ["dtk25", "014", MOLS.x, `${MOLS.y}.png`], 400],
    ["negative column", ["dtk25", MOLS.z, "-1", `${MOLS.y}.png`], 400],
    ["column outside the zoom", ["dtk25", "3", "8", "4.png"], 400],
    ["zoom above the ceiling", ["dtk25", "23", "0", "0.png"], 400],
    ["tile outside Denmark (Oslo)", ["dtk25", "14", "8681", "4766.png"], 404],
  ])("refuses %s without calling upstream", async (_name, [layer, z, x, y], status) => {
    const res = await call(layer, z, x, y);
    expect(res.status).toBe(status);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([["?BBOX=0,0,1,1"], ["?WIDTH=4096"], ["?url=https://example.com"], ["?apikey=x"]])(
    "refuses query parameters (%s)",
    async (search) => {
      const res = await call("dtk25", MOLS.z, MOLS.x, `${MOLS.y}.png`, { search });
      expect(res.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it("turns a WMS error (200 + XML) into 502 without leaking the upstream URL", async () => {
    fetchMock.mockResolvedValue(
      new Response(`<ServiceException>bad request https://wms.datafordeler.dk/?apikey=${KEY}</ServiceException>`, {
        status: 200,
        headers: { "content-type": "application/vnd.ogc.se_xml" },
      })
    );
    const res = await call("stednavne", MOLS.z, MOLS.x, `${MOLS.y}.png`);
    expect(res.status).toBe(502);
    expect(res.headers.get("cache-control")).toBe("no-store");
    await expectNoKeyLeak(res);
  });

  it("answers 504 on a network error and logs no URL or key", async () => {
    fetchMock.mockRejectedValue(new TypeError(`fetch failed for https://wms.datafordeler.dk/x?apikey=${KEY}`));
    const res = await call("contours", MOLS.z, MOLS.x, `${MOLS.y}.png`);
    expect(res.status).toBe(504);
    expect(warn).toHaveBeenCalled();
    await expectNoKeyLeak(res);
  });

  it("answers 504 when upstream stalls after the headers, and logs no key", async () => {
    const stalled = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array(10));
        c.error(new DOMException(`timed out https://wms.datafordeler.dk/x?apikey=${KEY}`, "TimeoutError"));
      },
    });
    fetchMock.mockResolvedValue(new Response(stalled, { status: 200, headers: { "content-type": "image/png" } }));
    const res = await call("dtk25", MOLS.z, MOLS.x, `${MOLS.y}.png`);
    expect(res.status).toBe(504);
    await expectNoKeyLeak(res);
  });

  it("stops reading a tile without Content-Length once it passes 4 MB", async () => {
    // 64 MB in 1 MB chunks.
    let pulled = 0;
    const huge = new ReadableStream<Uint8Array>({
      pull(c) {
        if (++pulled > 64) c.close();
        else c.enqueue(new Uint8Array(1024 * 1024));
      },
    });
    fetchMock.mockResolvedValue(new Response(huge, { status: 200, headers: { "content-type": "image/png" } }));
    const res = await call("dtk25", MOLS.z, MOLS.x, `${MOLS.y}.png`);
    expect(res.status).toBe(502);
    expect(pulled).toBeLessThan(10);
  });

  it("bypasses Next's instrumented fetch, whose tracing records the full URL", async () => {
    const instrumented = Object.assign(vi.fn(), { _nextOriginalFetch: fetchMock });
    vi.stubGlobal("fetch", instrumented);
    fetchMock.mockResolvedValue(image());
    const res = await call("dtk25", MOLS.z, MOLS.x, `${MOLS.y}.png`);
    expect(res.status).toBe(200);
    expect(instrumented).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("passes upstream throttling on as 503", async () => {
    fetchMock.mockResolvedValue(new Response("slow down", { status: 429 }));
    const res = await call("historisk_hoeje", MOLS.z, MOLS.x, `${MOLS.y}.png`);
    expect(res.status).toBe(503);
  });

  it("rate-limits per IP", async () => {
    fetchMock.mockImplementation(async () => image());
    let last: Response | undefined;
    for (let i = 0; i <= 3000; i++) last = await call("contours25", MOLS.z, MOLS.x, `${MOLS.y}.png`, { ip: "198.51.100.7" });
    expect(last?.status).toBe(429);
    expect(Number(last?.headers.get("retry-after"))).toBeGreaterThan(0);
    // Another client is unaffected.
    expect((await call("contours25", MOLS.z, MOLS.x, `${MOLS.y}.png`, { ip: "198.51.100.8" })).status).toBe(200);
  });
});
