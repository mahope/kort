import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Handler = (e: unknown) => void;

const { ctl, FakeMap, addSource } = vi.hoisted(() => {
// Controls what the fake map does; reset per test.
const ctl = {
  canvasW: 100,
  canvasH: 100,
  failOnLoad: [] as string[], // tile keys that error after load
  failOnReload: [] as string[], // tile keys that still fail after a retry
  errorsWithoutTile: [] as unknown[], // error events without a tile (style, glyphs, a source's header)
  reloads: 0,
  removed: [] as string[],
  updates: 0,
  notNeeded: [] as string[], // removed helper tiles the map does not request again
  noUpdate: false,
  maxSize: 8192,
  blob: true,
  gpuBusyPolls: 0, // clientWaitSync reports TIMEOUT_EXPIRED this many times before the GPU is idle
  gpuCalls: [] as string[],
  tiles: [] as string[], // tile keys that load fine (for progress counting)
  lastOptions: null as Record<string, unknown> | null,
  sourceBusyPolls: 0, // isSourceLoaded() is false this many times (a GeoJSON file still on its way)
  sourcePolls: 0,
  styleLayers: [] as { id: string; type: string }[], // the base style's layers (getStyle)
  added: [] as [string, string | undefined][], // addLayer(id, beforeId)
  depthSrc: [] as string[], // `src` of the søkort features in the loaded tiles
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
        removed: [] as string[],
        _removeTile(key: string) {
          ctl.reloads++;
          ctl.removed.push(key);
          this.removed.push(key);
        },
      },
    },
  };
  constructor(options: Record<string, unknown>) {
    ctl.lastOptions = options;
    if (ctl.noUpdate) (this as { _update?: unknown })._update = undefined;
    setTimeout(() => {
      for (const key of ctl.failOnLoad) this.emit("error", { sourceId: "src", tile: { tileID: { key } } });
      for (const ev of ctl.errorsWithoutTile) this.emit("error", ev);
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
  // _update() marks sources dirty; the next frame requests the removed tiles again.
  _update() {
    const src = this.style.tileManagers.src;
    for (const key of src.removed) {
      if (ctl.notNeeded.includes(key)) continue;
      if (ctl.failOnReload.includes(key)) this.emit("error", { sourceId: "src", tile: { tileID: { key } } });
      else this.emit("data", { dataType: "source", sourceId: "src", tile: { tileID: { key } } });
    }
    ctl.updates++;
    src.removed = [];
  }
  areTilesLoaded() { return true; }
  isSourceLoaded() { ctl.sourcePolls++; return ctl.sourceBusyPolls-- <= 0; }
  addSource = addSource;
  addLayer(layer: { id: string }, beforeId?: string) { ctl.added.push([layer.id, beforeId]); }
  getStyle() { return { layers: ctl.styleLayers }; }
  querySourceFeatures(_id: string, { sourceLayer }: { sourceLayer: string }) {
    return sourceLayer === "depth_contours" ? ctl.depthSrc.map((src) => ({ properties: { src } })) : [];
  }
  remove() {}
  getCanvas() {
    return { width: ctl.canvasW, height: ctl.canvasH, getContext: () => fakeGl(), toBlob: (cb: (b: Blob | null) => void) => cb(ctl.blob ? new Blob([new Uint8Array([1, 2, 3])]) : null) };
  }
}


  const addSource = vi.fn();
  return { ctl, FakeMap, addSource };
});

vi.mock("maplibre-gl", () => ({ default: { Map: FakeMap }, Map: FakeMap, setWorkerUrl: () => {}, addProtocol: () => {} }));
vi.mock("../limits", async (orig) => ({
  ...(await orig<typeof import("../limits")>()),
  getMaxCanvasSize: () => ctl.maxSize,
}));

import { renderMapToImage, TILE_RETRIES } from "../renderer";
import { DENMARK_TILE_BOUNDS } from "@/lib/tiles/routeLayers";

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
  addSource.mockClear();
  Object.assign(ctl, { canvasW: 100, canvasH: 100, failOnLoad: [], failOnReload: [], errorsWithoutTile: [], reloads: 0, removed: [], updates: 0, notNeeded: [], noUpdate: false, maxSize: 8192, blob: true, tiles: [], gpuBusyPolls: 0, gpuCalls: [], sourceBusyPolls: 0, sourcePolls: 0, styleLayers: [], added: [], depthSrc: [] });
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

describe("renderMapToImage base map", () => {
  const overlays = [{ id: "kurver5", enabled: true, opacity: 1 }] as typeof base.overlays;

  it("adds the raster tile source when a base map is selected", async () => {
    expect(await run({ ...base, overlays })).toHaveProperty("v");
    expect(addSource.mock.calls.map(([id]) => id)).toEqual(["base-ortofoto", "kurver5-overlay"]);
  });

  it("limits the Danish base map to the tile route's bounds, as the overlays", async () => {
    const hillshade = [{ id: "hillshade", enabled: true, opacity: 1 }] as typeof base.overlays;
    expect(await run({ ...base, baseLayer: "dtk25", overlays: hillshade })).toHaveProperty("v");
    const specs = Object.fromEntries(addSource.mock.calls.map(([id, spec]) => [id, spec]));
    expect(specs["base-dtk25"]).toMatchObject({ type: "raster", bounds: DENMARK_TILE_BOUNDS });
    expect(specs["base-dtk25"].tiles[0]).toMatch(/\/api\/tiles\/dtk25\/\{z\}\/\{x\}\/\{y\}\.png$/);
    expect(specs["hillshade-overlay"]).toMatchObject({ bounds: DENMARK_TILE_BOUNDS });
  });

  it("uses a white background and registers only the enabled overlays without a base map", async () => {
    expect(await run({ ...base, baseLayer: "none", overlays })).toHaveProperty("v");
    expect(ctl.lastOptions?.style).toMatchObject({
      sources: {},
      layers: [{ type: "background", paint: { "background-color": "#ffffff" } }],
    });
    expect(addSource.mock.calls.map(([id]) => id)).toEqual(["kurver5-overlay"]);
  });
});

describe("renderMapToImage søkort", () => {
  const overlays = [{ id: "soekort", enabled: true, opacity: 1 }] as typeof base.overlays;
  const skaermkort = [
    { id: "vand_hav", type: "fill" },
    { id: "linje_færgerute", type: "line" },
    { id: "natur_land", type: "fill" },
    { id: "vand_sø", type: "fill" },
    { id: "vand_sø_outline", type: "line" },
    { id: "veje", type: "line" },
    { id: "tekst_by", type: "symbol" },
  ];

  it("puts bands and lines under the skærmkort's land and the numbers under its place names", async () => {
    ctl.styleLayers = skaermkort;
    expect(await run({ ...base, baseLayer: "skaermkort", style: "klassisk", overlays })).toHaveProperty("v");
    const [id, spec] = addSource.mock.calls.find(([sid]) => sid === "soekort-overlay")!;
    expect(id).toBe("soekort-overlay");
    expect(spec).toEqual({ type: "vector", url: "pmtiles://https://tiles.mahoje.dk/soekort.pmtiles" });
    const before = Object.fromEntries(ctl.added);
    expect(before["soekort-overlay-areas-sea-z5"]).toBe("linje_færgerute");
    expect(before["soekort-overlay-areas-lake-z9"]).toBe("veje");
    expect(before["soekort-overlay-soundings-z12"]).toBe("tekst_by");
  });

  it("draws only lines and numbers, on top, over a raster base map", async () => {
    ctl.styleLayers = [{ id: "background", type: "background" }];
    expect(await run({ ...base, baseLayer: "dtk25", overlays })).toHaveProperty("v");
    const ids = ctl.added.filter(([lid]) => lid.startsWith("soekort-"));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.some(([lid]) => lid.includes("-areas-"))).toBe(false);
    expect(ids.every(([, b]) => b === undefined)).toBe(true);
  });

  it("reports which depth sources the print's tiles hold, for the credits", async () => {
    ctl.depthSrc = ["ddm", "novana", "ddm"];
    let found: Set<string> | undefined;
    await run({ ...base, overlays, onSoekortSources: (s: Set<string>) => (found = s) } as typeof base);
    expect(found).toEqual(new Set(["ddm", "novana"]));
  });
});

describe("renderMapToImage vector overlays", () => {
  const overlays = [{ id: "vrag", enabled: true, opacity: 1 }] as typeof base.overlays;

  it("adds our GeoJSON snapshot by absolute URL and waits until its data has arrived", async () => {
    ctl.sourceBusyPolls = 5;
    expect(await run({ ...base, overlays })).toHaveProperty("v");
    const [id, spec] = addSource.mock.calls.find(([sid]) => sid === "vrag-overlay")!;
    expect(id).toBe("vrag-overlay");
    expect(spec).toEqual({ type: "geojson", data: `${window.location.origin}/data/soekort/vrag.geojson` });
    expect(ctl.sourcePolls).toBeGreaterThan(5);
  });

  it("refuses the PDF when the snapshot cannot be fetched", async () => {
    ctl.sourceBusyPolls = Infinity;
    ctl.errorsWithoutTile = [{ sourceId: "vrag-overlay", error: new Error("404") }];
    expect(((await run({ ...base, overlays })) as { error: Error }).error.message).toBe(
      "Et kortlag kunne ikke hentes, så PDF'en ville mangle det. Prøv igen."
    );
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

  it("drops failed tiles and lets MapLibre request them anew, never reloading in place (#66)", async () => {
    ctl.failOnLoad = ["1", "2"];
    expect(await run()).toHaveProperty("v");
    expect(ctl.removed).toEqual(["1", "2"]);
    expect(ctl.updates).toBe(1); // one map update per retry round, not one per tile
  });

  it("does not count failed helper tiles the map no longer requests", async () => {
    ctl.failOnLoad = ["1", "2"];
    ctl.failOnReload = ["2"];
    ctl.notNeeded = ["2"];
    expect(await run()).toHaveProperty("v");
  });

  it("leaves failures counted when the map cannot be told to update", async () => {
    ctl.failOnLoad = ["1"];
    ctl.noUpdate = true;
    const r = await run();
    expect(ctl.removed).toEqual([]);
    expect((r as { error: Error }).error.message).toMatch(/^1 kortflise mangler/);
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

  it("does not count errors without a source (style, glyphs)", async () => {
    ctl.errorsWithoutTile = [{ error: new Error("glyphs 404") }];
    expect(await run()).toHaveProperty("v");
  });

  it("does not refuse the PDF for a broken local import", async () => {
    ctl.errorsWithoutTile = [{ sourceId: "pdf-import-1", error: new Error("worker") }];
    expect(await run()).toHaveProperty("v");
  });

  it("refuses the PDF when a whole source fails to load (contour archive down)", async () => {
    // MapLibre marks the source loaded with no tiles, so the tile wait alone would pass.
    ctl.errorsWithoutTile = [{ sourceId: "kurver5-overlay", error: new Error("header") }];
    expect(((await run()) as { error: Error }).error.message).toBe("Et kortlag kunne ikke hentes, så PDF'en ville mangle det. Prøv igen.");
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
