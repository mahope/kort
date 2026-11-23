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
export const SCREEN_RETRY_DELAYS_MS = [2000, 6000, 20000] as const;

/**
 * On screen MapLibre never asks again for a tile that failed (a WMS timeout or
 * a 5xx from Dataforsyningen), so the map kept a grey square of background
 * until the user panned. Ask again a few times, with growing pauses. Returns a
 * function that stops it.
 */
export function retryFailedTilesOnScreen(
  map: MaplibreMap,
  delays: readonly number[] = SCREEN_RETRY_DELAYS_MS
): () => void {
  const attempts = new Map<string, number>();
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const onError = (e: unknown) => {
    const ev = e as TileEvent;
    const tileKey = ev.tile?.tileID?.key;
    if (!ev.sourceId || tileKey === undefined) return;
    const key = `${ev.sourceId}/${tileKey}`;
    const attempt = attempts.get(key) ?? 0;
    if (attempt >= delays.length) return; // the server keeps failing: leave it
    attempts.set(key, attempt + 1);
    const timer = setTimeout(() => {
      timers.delete(timer);
      retryTiles(map, new Map([[key, { sourceId: ev.sourceId!, tileKey }]]));
    }, delays[attempt]);
    timers.add(timer);
  };
  const onData = (e: unknown) => {
    const ev = e as TileEvent;
    if (ev.dataType === "source" && ev.tile && ev.sourceId) attempts.delete(`${ev.sourceId}/${ev.tile.tileID?.key}`);
  };

  map.on("error", onError);
  map.on("data", onData);
  return () => {
    map.off("error", onError);
    map.off("data", onData);
    for (const t of timers) clearTimeout(t);
    timers.clear();
  };
}
