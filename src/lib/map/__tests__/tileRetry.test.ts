import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import { retryFailedTilesOnScreen } from "../tileRetry";

/** Just enough of a MapLibre map: events, a tile manager and _update. */
function fakeMap() {
  const handlers: Record<string, ((e: unknown) => void)[]> = {};
  const removed: (string | number)[] = [];
  const map = {
    updates: 0,
    removed,
    on(type: string, fn: (e: unknown) => void) {
      (handlers[type] ??= []).push(fn);
    },
    off(type: string, fn: (e: unknown) => void) {
      handlers[type] = (handlers[type] ?? []).filter((h) => h !== fn);
    },
    emit(type: string, e: unknown) {
      for (const h of handlers[type] ?? []) h(e);
    },
    style: { tileManagers: { "base-raster": { _removeTile: (k: string | number) => removed.push(k) } } },
    _update() {
      map.updates++;
    },
  };
  return map;
}

const tileError = { sourceId: "base-raster", tile: { tileID: { key: 42 } } };
const tileLoaded = { sourceId: "base-raster", dataType: "source", tile: { tileID: { key: 42 } } };

describe("retryFailedTilesOnScreen", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("asks again for a tile that failed, after a pause, instead of leaving a grey square", () => {
    const map = fakeMap();
    retryFailedTilesOnScreen(map as unknown as MaplibreMap, [1000, 3000]);
    map.emit("error", tileError);
    expect(map.removed).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(map.removed).toEqual([42]);
    expect(map.updates).toBe(1);
  });

  it("gives up after the last pause when the server keeps failing", () => {
    const map = fakeMap();
    retryFailedTilesOnScreen(map as unknown as MaplibreMap, [1000, 3000]);
    for (let i = 0; i < 5; i++) {
      map.emit("error", tileError);
      vi.advanceTimersByTime(3000);
    }
    expect(map.updates).toBe(2);
  });

  it("starts the count again once the tile has loaded", () => {
    const map = fakeMap();
    retryFailedTilesOnScreen(map as unknown as MaplibreMap, [1000]);
    map.emit("error", tileError);
    vi.advanceTimersByTime(1000);
    map.emit("data", tileLoaded);
    map.emit("error", tileError);
    vi.advanceTimersByTime(1000);
    expect(map.updates).toBe(2);
  });

  it("ignores source errors without a tile, and stops when told to", () => {
    const map = fakeMap();
    const stop = retryFailedTilesOnScreen(map as unknown as MaplibreMap, [1000]);
    map.emit("error", { sourceId: "base-raster" });
    map.emit("error", tileError);
    stop();
    vi.advanceTimersByTime(5000);
    expect(map.updates).toBe(0);
  });
});
