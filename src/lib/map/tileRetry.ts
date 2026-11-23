import type { Map as MaplibreMap } from "maplibre-gl";

/** A tile that errored, by source and MapLibre tile key. */
export interface FailedTile {
  sourceId: string;
  tileKey: number | string | undefined;
}

export type TileEvent = { sourceId?: string; dataType?: string; tile?: { tileID?: { key?: number | string } } };

// MapLibre has no public retry for errored tiles, and TileManager.reload()
// deliberately skips them. Drop each failed tile from its TileManager and let
// update() request it again like any new tile. Reloading it in place does not
// work for raster tiles (#66): as "expired" it counts as having data and was
// drawn without a texture ("reading 'bind'"); as "loading" MapLibre dropped
// some of them before they arrived, and the PDF was refused as incomplete.
type Manager = { _removeTile?: (id: number | string) => void };

type Internals = { _update?: () => void; redraw?: () => void; style?: { tileManagers?: Record<string, Manager> } };

/** Requests the failed tiles again; the ones it could drop are removed from `failed`. */
export function retryTiles(map: MaplibreMap, failed: Map<string, FailedTile>) {
  const internals = map as unknown as Internals;
  // Without _update a removed tile would never be requested again: leave the
  // failures counted so the PDF is refused loudly instead of having a hole.
  if (typeof internals._update !== "function") return;
  const managers = internals.style?.tileManagers;
  let removed = 0;
  // Iterate a snapshot: the loop deletes from `failed`.
  for (const [key, { sourceId, tileKey }] of Array.from(failed)) {
    const manager = managers?.[sourceId];
    if (tileKey === undefined || !manager?._removeTile) continue;
    manager._removeTile(tileKey);
    // Forget it: if the map still needs the tile it is requested again and an
    // error puts it back. Helper tiles (parents, edge buffer) are not, and must
    // not count as holes in the PDF.
    failed.delete(key);
    removed++;
  }
  if (removed === 0) return;
  // Marks the sources dirty, then renders synchronously so update() requests
  // the missing tiles now; waiting for the next frame left a window (and in a
  // hidden tab no frame at all) in which areTilesLoaded() saw nothing missing.
  internals._update();
  internals.redraw?.();
}

/** Pauses before each new attempt at a tile that failed on screen. */
const SCREEN_RETRY_DELAYS_MS = [2000, 6000, 20000] as const;

type MapEvent = TileEvent & { target: MaplibreMap; error?: unknown };

/**
 * On screen MapLibre never asks again for a tile that failed (a WMS timeout or
 * a 5xx from Dataforsyningen), so the map kept a grey square of background
 * until the user panned. These handlers ask again a few times, with growing
 * pauses. Pass them to the map as onError and onSourceData: they must be there
 * from the start, since the first tiles load before the map's load event.
 */
export function screenTileRetry(delays: readonly number[] = SCREEN_RETRY_DELAYS_MS) {
  const attempts = new Map<string, number>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  return {
    onError(e: MapEvent) {
      // What react-map-gl does without an onError handler.
      if (e.error) console.error(e.error);
      const { sourceId } = e;
      const tileKey = e.tile?.tileID?.key;
      if (!sourceId || tileKey === undefined) return;
      const key = `${sourceId}/${tileKey}`;
      const attempt = attempts.get(key) ?? 0;
      if (attempt >= delays.length) return; // the server keeps failing: leave it
      attempts.set(key, attempt + 1);
      const timer = setTimeout(() => {
        timers.delete(timer);
        retryTiles(e.target, new Map([[key, { sourceId, tileKey }]]));
      }, delays[attempt]);
      timers.add(timer);
    },
    onSourceData(e: TileEvent) {
      if (e.tile && e.sourceId) attempts.delete(`${e.sourceId}/${e.tile.tileID?.key}`);
    },
    stop() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
  };
}
