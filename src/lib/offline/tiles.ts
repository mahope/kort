import type { BaseLayer, OverlayId } from "@/types/map";
import type { PrintFrameBounds } from "@/types/print";
import { getRasterBaseLayers, OVERLAY_SOURCES, type RasterSourceConfig } from "@/lib/map/sources";
import { padBounds } from "@/lib/geo/bounds";
import { tileBBox3857, tileIntersects, type TileCoord } from "@/lib/tiles/bbox";

export { tileBBox3857, type TileCoord };

/**
 * Cache key for a tile: the URL without access token or key (identical to
 * offlineKey in public/sw.js). Tiles from our own route carry neither.
 */
export function offlineCacheKey(url: string): string {
  const u = new URL(url);
  u.searchParams.delete("token");
  u.searchParams.delete("apikey");
  return u.href;
}

/** Share of the frame size added on each side, so panning near the edge still hits the cache. */
export const OFFLINE_PADDING = 0.25;

/** Tile zoom levels saved for an area (tileSize 256, as the on-screen map). */
export const OFFLINE_MIN_ZOOM = 12;
export const OFFLINE_MAX_ZOOM = 16;
/** Dataforsyningen asks for modest load: never more requests in flight. */
export const OFFLINE_CONCURRENCY = 6;
/** Above this many tiles the user must confirm explicitly. */
const CONFIRM_TILE_COUNT = 2000;
/** ... or this many bytes (100 MB). */
const CONFIRM_BYTES = 100 * 1024 * 1024;
/** Hard ceiling so a mistake (huge multi-page area) cannot hammer the service. */
export const MAX_TILE_COUNT = 20000;

/**
 * Base layers that can be saved. OSM is excluded on purpose (its tile usage
 * policy forbids bulk downloads) and the vector "skærmkort" needs style, glyphs
 * and sprites, which are not tile-addressable.
 */
const SCREEN_RASTER = getRasterBaseLayers("screen");
const SAVEABLE_BASE: Partial<Record<BaseLayer, RasterSourceConfig>> = {
  ortofoto: SCREEN_RASTER.ortofoto,
  dtk25: SCREEN_RASTER.dtk25,
  historisk_hoeje: SCREEN_RASTER.historisk_hoeje,
  historisk_lave: SCREEN_RASTER.historisk_lave,
};

/** Rough average bytes per tile, measured on JPEG/PNG responses from Dataforsyningen. */
const AVG_TILE_BYTES: Record<string, number> = {
  ortofoto: 24 * 1024,
  dtk25: 18 * 1024,
  historisk_hoeje: 40 * 1024,
  historisk_lave: 40 * 1024,
  contours: 12 * 1024,
  hillshade: 15 * 1024,
  stednavne: 8 * 1024,
  matrikel: 8 * 1024,
};

export function isBaseLayerSaveable(layer: BaseLayer): boolean {
  return layer in SAVEABLE_BASE;
}

export function lngLatToTile(lng: number, lat: number, z: number): TileCoord {
  const n = 2 ** z;
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { z, x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

export function tilesForBounds(
  bounds: PrintFrameBounds,
  minZoom = OFFLINE_MIN_ZOOM,
  maxZoom = OFFLINE_MAX_ZOOM
): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const nw = lngLatToTile(bounds.west, bounds.north, z);
    const se = lngLatToTile(bounds.east, bounds.south, z);
    for (let x = nw.x; x <= se.x; x++) {
      for (let y = nw.y; y <= se.y; y++) tiles.push({ z, x, y });
    }
  }
  return tiles;
}

export function expandTileUrl(template: string, tile: TileCoord): string {
  return template
    .replace(/{z}/g, String(tile.z))
    .replace(/{x}/g, String(tile.x))
    .replace(/{y}/g, String(tile.y))
    .replace(/{bbox-epsg-3857}/g, () => tileBBox3857(tile));
}

/** Layer ids (base first) that an area covers: the saveable base plus overlays. */
export function offlineLayerIds(
  baseLayer: BaseLayer,
  overlays: { id: OverlayId; enabled: boolean }[]
): string[] {
  const ids: string[] = [];
  if (isBaseLayerSaveable(baseLayer)) ids.push(baseLayer);
  for (const o of overlays) if (o.enabled && !OVERLAY_SOURCES[o.id].noOffline) ids.push(o.id);
  return ids;
}

function sourceFor(layerId: string): Pick<RasterSourceConfig, "tiles" | "bounds" | "offlineFile"> | null {
  return SAVEABLE_BASE[layerId as BaseLayer] ?? OVERLAY_SOURCES[layerId as OverlayId] ?? null;
}

/**
 * The URL a saved layer uses for one tile, or null for unknown layers and for
 * tiles outside the layer's bounds: MapLibre never asks for those (and the
 * tile route refuses them).
 */
export function layerTileUrl(layerId: string, tile: TileCoord): string | null {
  const source = sourceFor(layerId);
  // A whole-file layer (our søkort) has no tiles; areaTilePlan adds the file once.
  if (!source || source.offlineFile || (source.bounds && !tileIntersects(tile, source.bounds))) return null;
  return expandTileUrl(source.tiles[0], tile);
}

/** The tiles (padded) an area covers on each saved zoom level. */
export function areaTiles(bounds: PrintFrameBounds): TileCoord[] {
  return tilesForBounds(padBounds(bounds, OFFLINE_PADDING));
}

/**
 * All tile URLs an area needs, deduplicated, and its estimated size from each
 * layer's own tile count (layers stop at their bounds), in one pass.
 */
export function areaTilePlan(bounds: PrintFrameBounds, layerIds: string[]): { urls: string[]; bytes: number } {
  const tiles = areaTiles(bounds);
  const urls = new Set<string>();
  let bytes = 0;
  for (const id of layerIds) {
    const file = sourceFor(id)?.offlineFile;
    if (file) {
      if (!urls.has(file.url)) bytes += file.bytes;
      urls.add(file.url);
      continue;
    }
    let count = 0;
    for (const t of tiles) {
      const url = layerTileUrl(id, t);
      if (!url) continue;
      urls.add(url);
      count++;
    }
    bytes += estimateBytes(count, [id]);
  }
  return { urls: [...urls], bytes };
}

/** All tile URLs an area needs, deduplicated. */
export function areaTileUrls(bounds: PrintFrameBounds, layerIds: string[]): string[] {
  return areaTilePlan(bounds, layerIds).urls;
}

export function estimateBytes(tileCountPerLayer: number, layerIds: string[]): number {
  return layerIds.reduce(
    (sum, id) => sum + tileCountPerLayer * (AVG_TILE_BYTES[id] ?? 20 * 1024),
    0
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("da-DK", {
    maximumFractionDigits: bytes < 10 * 1024 * 1024 ? 1 : 0,
  })} MB`;
}

export interface StartCheck {
  needsConfirm: boolean;
  tooLarge: boolean;
  exceedsQuota: boolean;
}

/** `availableBytes` is quota minus usage, or null when the browser can't tell. */
export function checkStart(
  tileCount: number,
  estimatedBytes: number,
  availableBytes: number | null
): StartCheck {
  return {
    needsConfirm: tileCount > CONFIRM_TILE_COUNT || estimatedBytes > CONFIRM_BYTES,
    tooLarge: tileCount > MAX_TILE_COUNT,
    exceedsQuota: availableBytes !== null && estimatedBytes > availableBytes * 0.9,
  };
}

/** Names every confirmation threshold the plan crosses, not just the first. */
export function confirmReason(tileCount: number, estimatedBytes: number): string {
  const reasons: string[] = [];
  if (tileCount > CONFIRM_TILE_COUNT) reasons.push(`over ${CONFIRM_TILE_COUNT.toLocaleString("da-DK")} fliser`);
  if (estimatedBytes > CONFIRM_BYTES) reasons.push("over 100 MB");
  return reasons.join(" og ");
}
