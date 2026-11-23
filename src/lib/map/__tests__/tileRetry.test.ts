import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import { screenTileRetry } from "../tileRetry";

/** Just enough of a MapLibre map: a tile manager with tile states, and _update. */
function fakeMap() {
  const removed: (string | number)[] = [];
  const states = new Map<string | number, string>();
  const map = {
    updates: 0,
    removed,
    states,
    style: {
      tileManagers: {
        "base-raster": {
          _removeTile: (k: string | number) => removed.push(k),
          getTileByID: (k: string | number) => (states.has(k) ? { state: states.get(k) } : undefined),
        },
      },
    },
    _update() {
      map.updates++;
    },
  };
  return map;
}

function setup(delays: number[]) {
  const map = fakeMap();
  const retry = screenTileRetry(delays);
  const target = map as unknown as MaplibreMap;
  return {
    map,
    retry,
    fail: () => {
      map.states.set(42, "errored");
      retry.onError({ target, sourceId: "base-raster", tile: { tileID: { key: 42 } } });
    },
    load: () => {
      map.states.set(42, "loaded");
      retry.onSourceData({ sourceId: "base-raster", dataType: "source", tile: { tileID: { key: 42 } } });
    },
  };
}

describe("screenTileRetry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("asks again for a tile that failed, after a pause, instead of leaving a grey square", () => {
    const { map, fail } = setup([1000, 3000]);
    fail();
    expect(map.removed).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(map.removed).toEqual([42]);
    expect(map.updates).toBe(1);
  });

  it("gives up after the last pause when the server keeps failing", () => {
    const { map, fail } = setup([1000, 3000]);
    for (let i = 0; i < 5; i++) {
      fail();
      vi.advanceTimersByTime(3000);
    }
    expect(map.updates).toBe(2);
  });

  it("starts the count again once the tile has loaded", () => {
    const { map, fail, load } = setup([1000]);
    fail();
    vi.advanceTimersByTime(1000);
    load();
    fail();
    vi.advanceTimersByTime(1000);
    expect(map.updates).toBe(2);
  });

  it("leaves the new tile alone when the base map is switched before the retry", () => {
    // DTK25 → ortofoto keeps the source id base-raster (setTiles), and MapLibre
    // reloads the failed key as a new, loading tile from the new map.
    const { map, fail } = setup([1000]);
    fail();
    map.states.set(42, "loading");
    vi.advanceTimersByTime(1000);
    expect(map.removed).toEqual([]);
    expect(map.updates).toBe(0);
  });

  it("cancels the pending retry once the tile has loaded", () => {
    const { map, fail, load } = setup([1000]);
    fail();
    load();
    map.states.set(42, "errored"); // even if a later state looks failed again
    vi.advanceTimersByTime(1000);
    expect(map.updates).toBe(0);
  });

  it("ignores source errors without a tile, and stops when told to", () => {
    const { map, retry, fail } = setup([1000]);
    retry.onError({ target: map as unknown as MaplibreMap, sourceId: "base-raster" });
    fail();
    retry.stop();
    vi.advanceTimersByTime(5000);
    expect(map.updates).toBe(0);
  });
});
