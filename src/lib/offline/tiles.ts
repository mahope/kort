import type { BaseLayer, OverlayId } from "@/types/map";
import type { PrintFrameBounds } from "@/types/print";
import {
  ORTOFOTO_SOURCE,
  DTK25_SCREEN_SOURCE,
  HISTORISK_HOEJE_SOURCE,
  HISTORISK_LAVE_SOURCE,
  OVERLAY_SOURCES,
} from "@/lib/map/sources";

/** Cache key for a tile: the URL without access token (identical to offlineKey in public/sw.js). */
export function offlineCacheKey(url: string): string {
  const u = new URL(url);
  u.searchParams.delete("token");
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
export const CONFIRM_TILE_COUNT = 2000;
/** ... or this many bytes (100 MB). */
export const CONFIRM_BYTES = 100 * 1024 * 1024;
/** Hard ceiling so a mistake (huge multi-page area) cannot hammer the service. */
export const MAX_TILE_COUNT = 20000;

const EPSG3857_RADIUS = 6378137;
const EXTENT_AT_ZOOM0 = 2 * Math.PI * EPSG3857_RADIUS;
const ORIGIN_X = -Math.PI * EPSG3857_RADIUS;
const ORIGIN_Y = Math.PI * EPSG3857_RADIUS;

/**
 * Base layers that can be saved. OSM is excluded on purpose (its tile usage
 * policy forbids bulk downloads) and the vector "skærmkort" needs style, glyphs
 * and sprites, which are not tile-addressable.
 */
const SAVEABLE_BASE: Partial<Record<BaseLayer, { tiles: string[] }>> = {
  ortofoto: ORTOFOTO_SOURCE,
  dtk25: DTK25_SCREEN_SOURCE,
  historisk_hoeje: HISTORISK_HOEJE_SOURCE,
  historisk_lave: HISTORISK_LAVE_SOURCE,
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

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

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

/** Same number formatting as MapLibre's `{bbox-epsg-3857}`, so cache keys match. */
export function tileBBox3857({ z, x, y }: TileCoord): string {
  const tilesAtZoom = 2 ** z;
  const tileExtent = EXTENT_AT_ZOOM0 / tilesAtZoom;
  const gridMinY = ORIGIN_Y - EXTENT_AT_ZOOM0;
  const rowFromBottom = tilesAtZoom - y - 1;
  return `${ORIGIN_X + x * tileExtent},${gridMinY + rowFromBottom * tileExtent},${ORIGIN_X + (x + 1) * tileExtent},${gridMinY + (rowFromBottom + 1) * tileExtent}`;
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
  for (const o of overlays) if (o.enabled) ids.push(o.id);
  return ids;
}

function templateFor(layerId: string): string | null {
  const base = SAVEABLE_BASE[layerId as BaseLayer];
  if (base) return base.tiles[0];
  const overlay = OVERLAY_SOURCES[layerId as OverlayId];
  return overlay ? overlay.tiles[0] : null;
}

/** All tile URLs an area needs, deduplicated. */
export function padBounds(bounds: PrintFrameBounds, ratio = OFFLINE_PADDING): PrintFrameBounds {
  const dx = (bounds.east - bounds.west) * ratio;
  const dy = (bounds.north - bounds.south) * ratio;
  return {
    ...bounds,
    west: bounds.west - dx,
    east: bounds.east + dx,
    south: bounds.south - dy,
    north: bounds.north + dy,
  };
}

export function areaTileUrls(bounds: PrintFrameBounds, layerIds: string[]): string[] {
  const tiles = tilesForBounds(padBounds(bounds));
  const urls = new Set<string>();
  for (const id of layerIds) {
    const template = templateFor(id);
    if (!template) continue;
    for (const t of tiles) urls.add(expandTileUrl(template, t));
  }
  return [...urls];
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
