import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Handler = (e: unknown) => void;

const { ctl, FakeMap, addSource } = vi.hoisted(() => {
  const ctl = { lastOptions: null as Record<string, unknown> | null };
  const addSource = vi.fn();
  class FakeMap {
    handlers: Record<string, Handler[]> = {};
    constructor(options: Record<string, unknown>) {
      ctl.lastOptions = options;
      setTimeout(() => this.emit("load", {}), 0);
    }
    on(n: string, h: Handler) { (this.handlers[n] ??= []).push(h); return this; }
    once(n: string, h: Handler) {
      const w: Handler = (e) => { this.handlers[n] = this.handlers[n].filter((x) => x !== w); h(e); };
      return this.on(n, w);
    }
    emit(n: string, e: unknown) { [...(this.handlers[n] ?? [])].forEach((h) => h(e)); }
    isStyleLoaded() { return true; }
    areTilesLoaded() { return true; }
    addSource = addSource;
    addLayer() {}
    remove() {}
    getCanvas() {
      return { width: 100, height: 100, toBlob: (cb: (b: Blob | null) => void) => cb(new Blob([new Uint8Array([1])])) };
    }
  }
  return { ctl, FakeMap, addSource };
});

vi.mock("maplibre-gl", () => ({ default: { Map: FakeMap }, Map: FakeMap, setWorkerUrl: () => {}, addProtocol: () => {} }));
vi.mock("../limits", async (orig) => ({ ...(await orig<typeof import("../limits")>()), getMaxCanvasSize: () => 8192 }));

import { renderMapToImage } from "../renderer";

type Opts = Parameters<typeof renderMapToImage>[0];

const JOTUNHEIMEN = { west: 8.25, east: 8.37, south: 61.6, north: 61.68 };
const KOEBENHAVN = { west: 12.5, east: 12.62, south: 55.64, north: 55.72 };

const base = {
  bounds: JOTUNHEIMEN,
  canvasWidth: 100,
  canvasHeight: 100,
  style: "klassisk",
  baseLayer: "dtk25",
  overlays: [],
  pxPerMm: 300 / 25.4,
} as unknown as Opts;

async function run(opts: Partial<Opts> = {}) {
  const p = renderMapToImage({ ...base, ...opts });
  const settled = p.then((v) => ({ v }), (error: Error) => ({ error }));
  await vi.advanceTimersByTimeAsync(30000);
  return settled;
}

const ids = () => addSource.mock.calls.map(([id]) => id);

beforeEach(() => {
  vi.useFakeTimers();
  addSource.mockClear();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});
afterEach(() => vi.useRealTimers());

describe("renderMapToImage in Norway and Sweden", () => {
  it("draws OpenTopoMap under Kartverket instead of DTK25 in Norway", async () => {
    expect(await run()).toHaveProperty("v");
    expect(ids()).toEqual(["nordic-opentopomap", "nordic-kartverket"]);
  });

  it("asks Kartverket's WMS at the paper resolution", async () => {
    await run();
    const kartverket = addSource.mock.calls.find(([id]) => id === "nordic-kartverket")?.[1];
    expect(kartverket.tiles[0]).toContain("MAP_RESOLUTION=300");
    expect(kartverket.bounds).toEqual([4.0, 57.8, 31.3, 71.3]);
  });

  it("replaces the vector Skærmkort as well", async () => {
    await run({ baseLayer: "skaermkort" });
    expect(ctl.lastOptions?.style).toMatchObject({ sources: {}, layers: [{ type: "background" }] });
    expect(ids()).toEqual(["nordic-opentopomap", "nordic-kartverket"]);
  });

  it("keeps OpenStreetMap when the user chose it", async () => {
    await run({ baseLayer: "osm" });
    expect(ids()).toEqual(["base-osm"]);
  });

  it("prints only Norwegian contours without a base map", async () => {
    await run({ baseLayer: "none", overlays: [{ id: "kurverNorge", enabled: true, opacity: 1 }] });
    expect(ids()).toEqual(["kurverNorge-overlay"]);
    expect(addSource.mock.calls[0][1].tiles[0]).toContain("MAP_RESOLUTION=300");
  });

  it("follows the region it is given (one for all sheets of a multi-page print)", async () => {
    await run({ bounds: KOEBENHAVN, region: "nordic" });
    expect(ids()).toEqual(["nordic-opentopomap", "nordic-kartverket"]);
  });

  it("leaves Denmark on DTK25", async () => {
    await run({ bounds: KOEBENHAVN });
    expect(ids()).toEqual(["base-dtk25"]);
  });
});
