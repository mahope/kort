import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Handler = (e: unknown) => void;

const { ctl, FakeMap } = vi.hoisted(() => {
// Controls what the fake map does; reset per test.
const ctl = {
  canvasW: 100,
  canvasH: 100,
  failOnLoad: [] as string[], // tile keys that error after load
  failOnReload: [] as string[], // tile keys that still fail after a retry
  reloads: 0,
  maxSize: 8192,
};

class FakeMap {
  handlers: Record<string, Handler[]> = {};
  loadedTiles = false;
  style = {
    _reloadSource: () => {
      ctl.reloads++;
      for (const key of ctl.failOnReload) this.emit("error", { sourceId: "src", tile: { tileID: { key } } });
      for (const key of ctl.failOnLoad.filter((k) => !ctl.failOnReload.includes(k))) {
        this.emit("data", { dataType: "source", sourceId: "src", tile: { tileID: { key } } });
      }
    },
  };
  constructor() {
    setTimeout(() => {
      for (const key of ctl.failOnLoad) this.emit("error", { sourceId: "src", tile: { tileID: { key } } });
      this.emit("load", {});
    }, 0);
  }
  on(n: string, h: Handler) { (this.handlers[n] ??= []).push(h); return this; }
  once(n: string, h: Handler) {
    const w: Handler = (e) => { this.handlers[n] = this.handlers[n].filter((x) => x !== w); h(e); };
    return this.on(n, w);
  }
  emit(n: string, e: unknown) { [...(this.handlers[n] ?? [])].forEach((h) => h(e)); }
  isStyleLoaded() { return true; }
  areTilesLoaded() { return true; }
  addSource() {}
  addLayer() {}
  remove() {}
  getCanvas() {
    return { width: ctl.canvasW, height: ctl.canvasH, toDataURL: () => "data:image/jpeg;base64,AAAA" };
  }
}


  return { ctl, FakeMap };
});

vi.mock("maplibre-gl", () => ({ default: { Map: FakeMap } }));
vi.mock("../limits", async (orig) => ({
  ...(await orig<typeof import("../limits")>()),
  getMaxCanvasSize: () => ctl.maxSize,
}));

import { renderMapToImage, TILE_RETRIES } from "../renderer";

const base = {
  bounds: { west: 10, east: 11, south: 55, north: 56 },
  canvasWidth: 100,
  canvasHeight: 100,
  style: "standard",
  baseLayer: "ortofoto",
  overlays: [],
} as unknown as Parameters<typeof renderMapToImage>[0];

async function run(opts = base) {
  const p = renderMapToImage(opts);
  const settled = p.then((v) => ({ v }), (error: Error) => ({ error }));
  await vi.advanceTimersByTimeAsync(30000);
  return settled;
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(ctl, { canvasW: 100, canvasH: 100, failOnLoad: [], failOnReload: [], reloads: 0, maxSize: 8192 });
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});
afterEach(() => vi.useRealTimers());

describe("renderMapToImage tile errors", () => {
  it("returns the image when no tile fails", async () => {
    expect(await run()).toEqual({ v: "data:image/jpeg;base64,AAAA" });
    expect(ctl.reloads).toBe(0);
  });

  it("retries failed tiles and succeeds when the retry works", async () => {
    ctl.failOnLoad = ["1", "2"];
    expect(await run()).toEqual({ v: "data:image/jpeg;base64,AAAA" });
    expect(ctl.reloads).toBe(1);
  });

  it("throws with the number of missing tiles after retries are exhausted", async () => {
    ctl.failOnLoad = ["1", "2", "3"];
    ctl.failOnReload = ["1", "2", "3"];
    const r = await run();
    expect(ctl.reloads).toBe(TILE_RETRIES);
    expect((r as { error: Error }).error.message).toBe("3 kortfliser mangler, så PDF'en ville have huller i kortet. Prøv igen.");
  });

  it("uses singular for one missing tile", async () => {
    ctl.failOnLoad = ["1"];
    ctl.failOnReload = ["1"];
    expect(((await run()) as { error: Error }).error.message).toMatch(/^1 kortflise mangler/);
  });

  it("does not count errors without a tile (style, glyphs)", async () => {
    expect(await run()).toHaveProperty("v");
  });
});

describe("renderMapToImage offline", () => {
  it("aborts before creating a map", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    expect(((await run()) as { error: Error }).error.message).toBe("Du er offline: kortet kan ikke hentes");
  });

  it("reports offline when connection drops during rendering", async () => {
    ctl.failOnLoad = ["1"];
    ctl.failOnReload = ["1"];
    const p = renderMapToImage(base);
    const settled = p.then((v) => ({ v }), (error: Error) => ({ error }));
    await vi.advanceTimersByTimeAsync(1);
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    await vi.advanceTimersByTimeAsync(30000);
    expect(((await settled) as { error: Error }).error.message).toBe("Du er offline: kortet kan ikke hentes");
  });
});

describe("renderMapToImage canvas limit", () => {
  it("throws with the highest possible dpi when the device limit is hit", async () => {
    ctl.maxSize = 4096;
    const r = await run({ ...base, canvasWidth: 4724, canvasHeight: 6780 });
    expect((r as { error: Error }).error.message).toContain("A2 kan højst udskrives med ca. 181 dpi");
  });

  it("does not throw for A4/300 at 8192", async () => {
    ctl.canvasW = 2244;
    ctl.canvasH = 3272;
    expect(await run({ ...base, canvasWidth: 2244, canvasHeight: 3272 })).toHaveProperty("v");
  });

  it("throws instead of delivering a downscaled canvas", async () => {
    ctl.canvasW = 50;
    const r = await run();
    expect((r as { error: Error }).error.message).toContain("50 x 100 px i stedet for 100 x 100 px");
  });
});
