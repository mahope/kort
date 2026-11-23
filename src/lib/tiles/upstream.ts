import { DATAFORSYNINGEN_TOKEN } from "@/lib/map/styles";
import { tileBBox3857, type TileCoord } from "./bbox";
import type { TileFormat, TileRouteLayer } from "./routeLayers";

/**
 * Upstream URLs for the tile route. With a Datafordeler API key the tiles come
 * from Datafordeleren (the `_DAF` services on Dataforsyningen close on
 * 26 Nov 2026). Without one (forks, local development) they come from the
 * Dataforsyningen services the app used before, with the public token.
 * Both serve byte-identical tiles (checked 23 Nov 2026 on every layer).
 *
 * Server only: the returned URL can carry the key. Never log or return it.
 */

interface WmsLayer {
  kind: "wms";
  /** Datafordeleren service path on wms.datafordeler.dk, and its layer name. */
  dafo: { path: string; layers: string };
  /** Today's Dataforsyningen service (fallback), and its layer name. */
  df: { service: string; layers: string; styles: string };
}

interface WmtsLayer {
  kind: "wmts";
  dafo: { url: string };
  df: { url: string };
  layer: string;
  matrixSet: string;
}

const DAFO_WMS = "https://wms.datafordeler.dk";
const DF_API = "https://api.dataforsyningen.dk";

const DHM_DAFO = "/DHMNedboer/dhm/1.0.0/WMS";

const UPSTREAM_LAYERS: Record<TileRouteLayer, WmsLayer | WmtsLayer> = {
  dtk25: {
    kind: "wms",
    // `dtk25` is the current edition; `dtk_25` is the group with every year.
    dafo: { path: "/DKtopokort/dtk_25/1.0.0/WMS", layers: "dtk25" },
    df: { service: "dtk_25_DAF", layers: "DTK25", styles: "default" },
  },
  ortofoto: {
    kind: "wmts",
    dafo: { url: "https://wmts.datafordeler.dk/GeoDanmarkOrto/orto_foraar_webm/1.0.0/WMTS" },
    df: { url: `${DF_API}/orto_foraar_webm_DAF` },
    layer: "orto_foraar_webm",
    matrixSet: "DFD_GoogleMapsCompatible",
  },
  historisk_hoeje: {
    kind: "wms",
    dafo: { path: "/HoejeMaalebordsblade/topo20_hoeje_maalebordsblade/1.0.0/wms", layers: "dtk_hoeje_maalebordsblade" },
    df: { service: "topo20_hoeje_maalebordsblade_DAF", layers: "dtk_hoeje_maalebordsblade", styles: "default" },
  },
  historisk_lave: {
    kind: "wms",
    dafo: { path: "/LaveMaalebordsblade/topo20_lave_maalebordsblade/1.0.0/wms", layers: "dtk_lave_maalebordsblade" },
    df: { service: "topo20_lave_maalebordsblade_DAF", layers: "dtk_lave_maalebordsblade", styles: "default" },
  },
  stednavne: {
    kind: "wms",
    // The group layer with every place-name type, as on Dataforsyningen.
    dafo: { path: "/STEDNAVN/Danske_Stednavne/1.0.0/WMS", layers: "danske_stednavne" },
    df: { service: "danske_stednavne_DAF", layers: "danske_stednavne", styles: "default" },
  },
  contours: {
    kind: "wms",
    dafo: { path: DHM_DAFO, layers: "dhm_kurve_0_5_m" },
    df: { service: "dhm_DAF", layers: "dhm_kurve_0_5_m", styles: "" },
  },
  contours25: {
    kind: "wms",
    dafo: { path: DHM_DAFO, layers: "dhm_kurve_traditionel" },
    df: { service: "dhm_DAF", layers: "dhm_kurve_traditionel", styles: "" },
  },
  hillshade: {
    kind: "wms",
    dafo: { path: DHM_DAFO, layers: "dhm_terraen_skyggekort" },
    df: { service: "dhm_DAF", layers: "dhm_terraen_skyggekort", styles: "" },
  },
};

const MIME: Record<TileFormat, string> = { png: "image/png", jpg: "image/jpeg" };

export function tileMimeType(format: TileFormat): string {
  return MIME[format];
}

/**
 * The upstream URL for one tile. `apiKey` set: Datafordeleren with `apikey`;
 * empty: Dataforsyningen with the public token.
 */
export function upstreamTileUrl(layer: TileRouteLayer, tile: TileCoord, format: TileFormat, apiKey?: string): string {
  const def = UPSTREAM_LAYERS[layer];
  const mime = MIME[format];
  const params = new URLSearchParams();
  let base: string;
  if (def.kind === "wmts") {
    base = apiKey ? def.dafo.url : def.df.url;
    params.set("service", "WMTS");
    params.set("request", "GetTile");
    params.set("version", "1.0.0");
    params.set("layer", def.layer);
    params.set("style", "default");
    params.set("TileMatrixSet", def.matrixSet);
    params.set("TileMatrix", String(tile.z));
    params.set("TileRow", String(tile.y));
    params.set("TileCol", String(tile.x));
    params.set("format", mime);
  } else {
    base = apiKey ? `${DAFO_WMS}${def.dafo.path}` : `${DF_API}/${def.df.service}`;
    params.set("service", "WMS");
    params.set("version", "1.1.1");
    params.set("request", "GetMap");
    params.set("SRS", "EPSG:3857");
    params.set("WIDTH", "256");
    params.set("HEIGHT", "256");
    params.set("LAYERS", apiKey ? def.dafo.layers : def.df.layers);
    params.set("STYLES", apiKey ? "" : def.df.styles);
    // JPEG has no alpha; DTK25 is opaque, so the screen asks for it without.
    params.set("TRANSPARENT", format === "png" ? "TRUE" : "FALSE");
    params.set("FORMAT", mime);
    params.set("BBOX", tileBBox3857(tile));
  }
  if (apiKey) params.set("apikey", apiKey);
  else params.set("token", DATAFORSYNINGEN_TOKEN);
  return `${base}?${params.toString()}`;
}

/** How long browsers and Cloudflare may keep a tile. */
const WEEK = 7 * 24 * 3600;
const MONTH = 30 * 24 * 3600;
const MAX_AGE: Record<TileRouteLayer, number> = {
  // Updated now and then (DTK yearly, orthophoto each spring).
  dtk25: WEEK,
  ortofoto: WEEK,
  // Historic or frozen (Danske Stednavne since Sept 2025), DHM rarely.
  historisk_hoeje: MONTH,
  historisk_lave: MONTH,
  stednavne: MONTH,
  contours: MONTH,
  contours25: MONTH,
  hillshade: MONTH,
};

export function tileCacheControl(layer: TileRouteLayer): string {
  const age = MAX_AGE[layer];
  return `public, max-age=${age}, s-maxage=${age}, stale-while-revalidate=${MONTH}, stale-if-error=${MONTH}`;
}
