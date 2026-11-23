import type { NextRequest } from "next/server";
import { clientKey } from "@/lib/api/clientKey";
import { createRateLimiter } from "@/lib/stednavne/rateLimit";
import { tileIntersects, type TileCoord } from "@/lib/tiles/bbox";
import {
  DENMARK_TILE_BOUNDS,
  isTileRouteLayer,
  TILE_ROUTE_FORMATS,
  TILE_ROUTE_MAX_ZOOM,
  type TileFormat,
} from "@/lib/tiles/routeLayers";
import { tileCacheControl, tileMimeType, upstreamTileUrl } from "@/lib/tiles/upstream";

// Tiles for the Danish raster layers. The Datafordeler API key is added here,
// on the server (DATAFORDELER_API_KEY, runtime env), and never reaches the
// client. Not an open proxy: only the layers in routeLayers.ts, one 256 px
// EPSG:3857 tile at a time, inside Denmark, no query string. Without a key the
// route serves the same tiles from Dataforsyningen with the public token.
export const runtime = "nodejs";

// A 300 dpi A4 print is 88-352 tiles per layer, and saving an area offline
// runs 6 requests in parallel; one IP can be a whole scout group behind NAT.
const limiter = createRateLimiter({ limit: 3000, windowMs: 60_000 });

const UPSTREAM_TIMEOUT_MS = 20_000;
/** The biggest tiles (historic maps, PNG) are about 200 KB. */
const MAX_TILE_BYTES = 4 * 1024 * 1024;

const INT = /^(0|[1-9]\d{0,6})$/;
const Y_WITH_FORMAT = /^(0|[1-9]\d{0,6})\.(png|jpg)$/;

function fail(status: number, message: string, extra: Record<string, string> = {}): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...extra },
  });
}

type Params = { layer: string; z: string; x: string; y: string };

export async function GET(req: NextRequest, { params }: { params: Promise<Params> }): Promise<Response> {
  const { layer, z: zs, x: xs, y: yWithFormat } = await params;
  if (!isTileRouteLayer(layer)) return fail(404, "Ukendt lag");
  // Nothing but the path decides the tile: no BBOX, size, format or host from the client.
  if (req.nextUrl.search !== "") return fail(400, "Ingen parametre tilladt");

  const ym = Y_WITH_FORMAT.exec(yWithFormat);
  if (!INT.test(zs) || !INT.test(xs) || !ym) return fail(400, "Ugyldig flise");
  const format = ym[2] as TileFormat;
  if (!TILE_ROUTE_FORMATS[layer].includes(format)) return fail(400, "Formatet findes ikke for laget");
  const tile: TileCoord = { z: Number(zs), x: Number(xs), y: Number(ym[1]) };
  const n = 2 ** tile.z;
  if (tile.z > TILE_ROUTE_MAX_ZOOM || tile.x >= n || tile.y >= n) return fail(400, "Ugyldig flise");
  if (!tileIntersects(tile, DENMARK_TILE_BOUNDS)) return fail(404, "Flisen ligger uden for Danmark");

  const rate = limiter.hit(clientKey(req));
  if (!rate.ok) return fail(429, "For mange forespørgsler", { "Retry-After": String(rate.retryAfterSeconds) });

  const apiKey = process.env.DATAFORDELER_API_KEY?.trim() || undefined;
  const source = apiKey ? "datafordeler" : "dataforsyningen";
  const mime = tileMimeType(format);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamTileUrl(layer, tile, format, apiKey), {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    // Log the kind of failure only: the error can quote the URL, which holds the key.
    console.warn(`tiles: ${layer} upstream ${source} failed (${err instanceof Error ? err.name : "unknown"})`);
    return fail(504, "Kortflisen kunne ikke hentes");
  }

  const type = (upstream.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  // WMS servers answer errors with 200 + XML; only the expected image type passes.
  if (!upstream.ok || type !== mime) {
    console.warn(`tiles: ${layer} upstream ${source} answered ${upstream.status} ${type || "-"}`);
    await upstream.body?.cancel().catch(() => {});
    // Throttling upstream reads as 503 here, so offline saving stops instead of pushing on.
    const status = upstream.status === 429 || upstream.status === 503 ? 503 : 502;
    return fail(status, "Kortflisen kunne ikke hentes");
  }

  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (length > MAX_TILE_BYTES) {
    await upstream.body?.cancel().catch(() => {});
    return fail(502, "Kortflisen er for stor");
  }
  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_TILE_BYTES) return fail(502, "Kortflisen er for stor");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(body.byteLength),
      "Cache-Control": tileCacheControl(layer),
      "X-Content-Type-Options": "nosniff",
      // Which upstream answered (no URL, no key): handy when checking a deploy.
      "X-Tile-Source": source,
    },
  });
}
