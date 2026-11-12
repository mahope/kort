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
  reloadStates: [] as string[],
  maxSize: 8192,
  blob: true,
  gpuBusyPolls: 0, // clientWaitSync reports TIMEOUT_EXPIRED this many times before the GPU is idle
  gpuCalls: [] as string[],
  tiles: [] as string[], // tile keys that load fine (for progress counting)
  lastOptions: null as Record<string, unknown> | null,
};

function fakeGl() {
  return {
    SYNC_GPU_COMMANDS_COMPLETE: 1, TIMEOUT_EXPIRED: 2, ALREADY_SIGNALED: 3,
    fenceSync: () => { ctl.gpuCalls.push("fence"); return {}; },
    flush: () => { ctl.gpuCalls.push("flush"); },
    clientWaitSync: () => { ctl.gpuCalls.push("wait"); return ctl.gpuBusyPolls-- > 0 ? 2 : 3; },
    deleteSync: () => { ctl.gpuCalls.push("delete"); },
  };
}

class FakeMap {
  handlers: Record<string, Handler[]> = {};
  loadedTiles = false;
  style = {
    tileManagers: {
      src: {
        _reloadTile: (key: string, state: string) => {
          ctl.reloads++;
          ctl.reloadStates.push(state);
          if (ctl.failOnReload.includes(key)) this.emit("error", { sourceId: "src", tile: { tileID: { key } } });
          else this.emit("data", { dataType: "source", sourceId: "src", tile: { tileID: { key } } });
        },
      },
    },
  };
  constructor(options: Record<string, unknown>) {
    ctl.lastOptions = options;
    setTimeout(() => {
      for (const key of ctl.failOnLoad) this.emit("error", { sourceId: "src", tile: { tileID: { key } } });
      for (const key of ctl.tiles) this.emit("dataloading", { dataType: "source", sourceId: "src", tile: { tileID: { key } } });
      for (const key of ctl.tiles) this.emit("data", { dataType: "source", sourceId: "src", tile: { tileID: { key } } });
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
    return { width: ctl.canvasW, height: ctl.canvasH, getContext: () => fakeGl(), toBlob: (cb: (b: Blob | null) => void) => cb(ctl.blob ? new Blob([new Uint8Array([1, 2, 3])]) : null) };
  }
}


  return { ctl, FakeMap };
});

vi.mock("maplibre-gl", () => ({ default: { Map: FakeMap }, Map: FakeMap, setWorkerUrl: () => {} }));
vi.mock("../limits", async (orig) => ({
  ...(await orig<typeof import("../limits")>()),
  getMaxCanvasSize: () => ctl.maxSize,
}));

import { renderMapToImage, TILE_RETRIES } from "../renderer";

const OFFLINE_PDF_MESSAGE =
  "Du er offline: PDF kræver internet, også for gemte områder. Gemte områder virker kun i kortvisningen";

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
  Object.assign(ctl, { canvasW: 100, canvasH: 100, failOnLoad: [], failOnReload: [], reloads: 0, reloadStates: [], maxSize: 8192, blob: true, tiles: [], gpuBusyPolls: 0, gpuCalls: [] });
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});
afterEach(() => vi.useRealTimers());

describe("renderMapToImage canvas size", () => {
  it("lets MapLibre use the device limit instead of its 4096 px default", async () => {
    // A2 at 300 dpi is about 4724 x 6780 px; MapLibre would scale that down.
    ctl.maxSize = 8192;
    await run();
    expect(ctl.lastOptions?.maxCanvasSize).toEqual([8192, 8192]);
  });
});

describe("renderMapToImage tile errors", () => {
  it("returns the image when no tile fails", async () => {
    expect(await run()).toEqual({ v: new Uint8Array([1, 2, 3]) });
    expect(ctl.reloads).toBe(0);
  });

  it("retries failed tiles and succeeds when the retry works", async () => {
    ctl.failOnLoad = ["1", "2"];
    expect(await run()).toEqual({ v: new Uint8Array([1, 2, 3]) });
    expect(ctl.reloads).toBe(2);
  });

  it("re-requests failed tiles as loading, not expired (expired has no texture and crashes the raster draw, #66)", async () => {
    ctl.failOnLoad = ["1"];
    await run();
    expect(ctl.reloadStates).toEqual(["loading"]);
  });

  it("throws with the number of missing tiles after retries are exhausted", async () => {
    ctl.failOnLoad = ["1", "2", "3"];
    ctl.failOnReload = ["1", "2", "3"];
    const r = await run();
    expect(ctl.reloads).toBe(3 * TILE_RETRIES);
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

describe("renderMapToImage progress and encoding", () => {
  it("reports requested and loaded tile counts", async () => {
    ctl.tiles = ["1", "2", "3"];
    const calls: Array<[number, number]> = [];
    await run({ ...base, onTileProgress: (loaded, total) => calls.push([loaded, total]) });
    expect(calls[0]).toEqual([0, 1]);
    expect(calls[calls.length - 1]).toEqual([3, 3]);
  });

  it("polls a GPU fence until the render is done before reading pixels back", async () => {
    ctl.gpuBusyPolls = 3;
    expect(await run()).toHaveProperty("v");
    expect(ctl.gpuCalls).toEqual(["fence", "flush", "wait", "wait", "wait", "wait", "delete"]);
  });

  it("stops polling the GPU fence when the tab is hidden", async () => {
    ctl.gpuBusyPolls = 3;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    try {
      expect(await run()).toHaveProperty("v");
    } finally {
      delete (document as unknown as { hidden?: boolean }).hidden;
    }
    expect(ctl.gpuCalls).toEqual(["fence", "flush", "delete"]);
  });

  it("throws a clear error when the browser cannot encode the canvas", async () => {
    ctl.blob = false;
    expect(((await run()) as { error: Error }).error.message).toContain("kunne ikke gemmes som JPEG");
  });
});

describe("renderMapToImage offline", () => {
  it("aborts before creating a map", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    expect(((await run()) as { error: Error }).error.message).toBe(OFFLINE_PDF_MESSAGE);
  });

  it("refuses PDF offline even for a saved DTK25 area (no screen-tile fallback)", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const r = await run({ ...base, baseLayer: "dtk25" } as typeof base);
    expect((r as { error: Error }).error.message).toBe(OFFLINE_PDF_MESSAGE);
    expect((r as { error: Error }).error.message).toContain("kun i kortvisningen");
  });

  it("reports offline when connection drops during rendering", async () => {
    ctl.failOnLoad = ["1"];
    ctl.failOnReload = ["1"];
    const p = renderMapToImage(base);
    const settled = p.then((v) => ({ v }), (error: Error) => ({ error }));
    await vi.advanceTimersByTimeAsync(1);
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    await vi.advanceTimersByTimeAsync(30000);
    expect(((await settled) as { error: Error }).error.message).toBe(OFFLINE_PDF_MESSAGE);
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
