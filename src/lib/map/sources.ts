import type { OverlayId } from "@/types/map";
import { DATAFORSYNINGEN_TOKEN } from "./styles";

/**
 * Ortofoto WMTS tile URL template.
 * Uses DFD_GoogleMapsCompatible TileMatrixSet (EPSG:3857).
 */
const ORTOFOTO_TILES_URL =
  `https://api.dataforsyningen.dk/orto_foraar_webm_DAF?` +
  `service=WMTS&request=GetTile&version=1.0.0` +
  `&layer=orto_foraar_webm&style=default` +
  `&TileMatrixSet=DFD_GoogleMapsCompatible` +
  `&TileMatrix={z}&TileRow={y}&TileCol={x}` +
  `&format=image/jpeg&token=${DATAFORSYNINGEN_TOKEN}`;

/**
 * DTK 25 (topografisk kort 1:25.000) WMS tile URL.
 * Uses Dataforsyningens dtk_25_DAF service.
 */
export const DTK25_TILES_URL =
  `https://api.dataforsyningen.dk/dtk_25_DAF?` +
  `service=WMS&version=1.1.1&request=GetMap` +
  `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256` +
  `&LAYERS=DTK25&STYLES=default` +
  `&TRANSPARENT=TRUE&FORMAT=image/png` +
  `&token=${DATAFORSYNINGEN_TOKEN}` +
  `&BBOX={bbox-epsg-3857}`;

/**
 * DTK 25 for on-screen use: the layer is opaque, so JPEG is 7-13x smaller than
 * PNG. The PDF renderer keeps using DTK25_TILES_URL (PNG) for full quality.
 */
const DTK25_SCREEN_TILES_URL = DTK25_TILES_URL.replace(
  "TRANSPARENT=TRUE&FORMAT=image/png",
  "TRANSPARENT=FALSE&FORMAT=image/jpeg"
);

/**
 * Høje Målebordsblade (1842-1899) WMS tile URL.
 */
const HISTORISK_HOEJE_TILES_URL =
  `https://api.dataforsyningen.dk/topo20_hoeje_maalebordsblade_DAF?` +
  `service=WMS&version=1.1.1&request=GetMap` +
  `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256` +
  `&LAYERS=dtk_hoeje_maalebordsblade&STYLES=default` +
  `&TRANSPARENT=TRUE&FORMAT=image/png` +
  `&token=${DATAFORSYNINGEN_TOKEN}` +
  `&BBOX={bbox-epsg-3857}`;

/**
 * Lave Målebordsblade (1901-1971) WMS tile URL.
 */
const HISTORISK_LAVE_TILES_URL =
  `https://api.dataforsyningen.dk/topo20_lave_maalebordsblade_DAF?` +
  `service=WMS&version=1.1.1&request=GetMap` +
  `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256` +
  `&LAYERS=dtk_lave_maalebordsblade&STYLES=default` +
  `&TRANSPARENT=TRUE&FORMAT=image/png` +
  `&token=${DATAFORSYNINGEN_TOKEN}` +
  `&BBOX={bbox-epsg-3857}`;

/**
 * Danske Stednavne WMS tile URL.
 */
const STEDNAVNE_TILES_URL =
  `https://api.dataforsyningen.dk/danske_stednavne_DAF?` +
  `service=WMS&version=1.1.1&request=GetMap` +
  `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256` +
  `&LAYERS=danske_stednavne&STYLES=default` +
  `&TRANSPARENT=TRUE&FORMAT=image/png` +
  `&token=${DATAFORSYNINGEN_TOKEN}` +
  `&BBOX={bbox-epsg-3857}`;

/**
 * Matrikelskel WMS tile URL.
 */
const MATRIKEL_TILES_URL =
  `https://api.dataforsyningen.dk/forvaltning2_udv?` +
  `service=WMS&version=1.1.1&request=GetMap` +
  `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256` +
  `&LAYERS=Matrikelskel&STYLES=default` +
  `&TRANSPARENT=TRUE&FORMAT=image/png` +
  `&token=${DATAFORSYNINGEN_TOKEN}` +
  `&BBOX={bbox-epsg-3857}`;

/**
 * DHM (Danmarks Højdemodel) WMS base URL.
 * Used for contours and hillshade overlays.
 */
const DHM_WMS_BASE =
  `https://api.dataforsyningen.dk/dhm_DAF?` +
  `service=WMS&version=1.1.1&request=GetMap` +
  `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256` +
  `&STYLES=&TRANSPARENT=TRUE&FORMAT=image/png` +
  `&token=${DATAFORSYNINGEN_TOKEN}`;

/**
 * DHM Contour lines (0.5m) WMS tile URL.
 */
const DHM_CONTOURS_URL =
  `${DHM_WMS_BASE}&LAYERS=dhm_kurve_0_5_m&BBOX={bbox-epsg-3857}`;

/**
 * DHM "traditionel" contours: 2.5 m interval, heavily smoothed for 1:25.000.
 * Much calmer on a 1:25.000 print than the 0.5 m lines.
 */
const DHM_CONTOURS_25_URL =
  `${DHM_WMS_BASE}&LAYERS=dhm_kurve_traditionel&BBOX={bbox-epsg-3857}`;

/**
 * EMODnet Bathymetry (CC BY 4.0), mean depth, transparent over land. The
 * service colours depth red to yellow; the layer paint turns it into blues.
 * Coarse (about 115 m cells) and never for navigation.
 */
const EMODNET_DEPTH_URL =
  `https://ows.emodnet-bathymetry.eu/wms?service=WMS&version=1.1.1&request=GetMap` +
  `&LAYERS=emodnet:mean_multicolour&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE` +
  `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`;

/** OpenSeaMap seamarks (buoys, beacons, lights), transparent XYZ overlay. */
const OPENSEAMAP_URL = "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png";

/**
 * DHM Hillshade (terrain shadow) WMS tile URL.
 */
const DHM_HILLSHADE_URL =
  `${DHM_WMS_BASE}&LAYERS=dhm_terraen_skyggekort&BBOX={bbox-epsg-3857}`;

/**
 * Minimal blank MapLibre style for use with ortofoto raster base layer.
 */
export const BLANK_STYLE = {
  version: 8 as const,
  glyphs: "https://cdn.dataforsyningen.dk/assets/vector_tiles_assets/latest/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#f0f0f0" },
    },
  ],
};

export interface RasterSourceConfig {
  tiles: string[];
  tileSize: number;
  attribution: string;
  /** Short credit for the PDF footer (plain text). */
  credit?: string;
  /** Extra raster paint (besides opacity), shared by screen and PDF. */
  paint?: { "raster-hue-rotate"?: number; "raster-saturation"?: number; "raster-contrast"?: number };
  /** Third-party host whose terms do not cover bulk prefetching: never saved offline. */
  noOffline?: boolean;
  /** Sea data: the PDF carries "Ikke til navigation". */
  notForNavigation?: boolean;
}

const ORTOFOTO_SOURCE: RasterSourceConfig = {
  tiles: [ORTOFOTO_TILES_URL],
  tileSize: 256,
  attribution: "&copy; Klimadatastyrelsen",
};

export const DTK25_SOURCE: RasterSourceConfig = {
  tiles: [DTK25_TILES_URL],
  tileSize: 256,
  attribution: "&copy; Klimadatastyrelsen (DTK25)",
};

export const DTK25_SCREEN_SOURCE: RasterSourceConfig = {
  ...DTK25_SOURCE,
  tiles: [DTK25_SCREEN_TILES_URL],
};

const OSM_SOURCE: RasterSourceConfig = {
  tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  tileSize: 256,
  attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
};

const HISTORISK_HOEJE_SOURCE: RasterSourceConfig = {
  tiles: [HISTORISK_HOEJE_TILES_URL],
  tileSize: 256,
  attribution: "&copy; Klimadatastyrelsen (Høje Målebordsblade)",
};

const HISTORISK_LAVE_SOURCE: RasterSourceConfig = {
  tiles: [HISTORISK_LAVE_TILES_URL],
  tileSize: 256,
  attribution: "&copy; Klimadatastyrelsen (Lave Målebordsblade)",
};

/**
 * The one definition of the raster base maps, for the live map and the PDF.
 * Only DTK25 differs: the screen uses opaque JPEG, the PDF keeps PNG for full
 * quality.
 */
export type RasterBaseLayerTarget = "screen" | "print";

export function getRasterBaseLayers(target: RasterBaseLayerTarget): Record<string, RasterSourceConfig> {
  return {
    ortofoto: ORTOFOTO_SOURCE,
    dtk25: target === "screen" ? DTK25_SCREEN_SOURCE : DTK25_SOURCE,
    osm: OSM_SOURCE,
    historisk_hoeje: HISTORISK_HOEJE_SOURCE,
    historisk_lave: HISTORISK_LAVE_SOURCE,
  };
}

export const OVERLAY_SOURCES: Record<OverlayId, RasterSourceConfig> = {
  contours: {
    tiles: [DHM_CONTOURS_URL],
    tileSize: 256,
    attribution: "&copy; Klimadatastyrelsen (DHM)",
  },
  contours25: {
    tiles: [DHM_CONTOURS_25_URL],
    tileSize: 256,
    attribution: "&copy; Klimadatastyrelsen (DHM)",
  },
  hillshade: {
    tiles: [DHM_HILLSHADE_URL],
    tileSize: 256,
    attribution: "&copy; Klimadatastyrelsen (DHM)",
  },
  stednavne: {
    tiles: [STEDNAVNE_TILES_URL],
    tileSize: 256,
    attribution: "&copy; Klimadatastyrelsen (Stednavne)",
  },
  matrikel: {
    tiles: [MATRIKEL_TILES_URL],
    tileSize: 256,
    attribution: "&copy; Klimadatastyrelsen (Matrikelskel)",
  },
  havdybder: {
    tiles: [EMODNET_DEPTH_URL],
    tileSize: 256,
    attribution: "Dybder: <a href='https://emodnet.ec.europa.eu/en/bathymetry'>EMODnet Bathymetry</a> (CC BY 4.0). Ikke til navigation",
    credit: "Dybder: EMODnet Bathymetry (CC BY 4.0)",
    // Red-yellow ramp turned into blue-cyan, toned down so the map stays readable.
    paint: { "raster-hue-rotate": 200, "raster-saturation": -0.3 },
    noOffline: true,
    notForNavigation: true,
  },
  soemaerker: {
    tiles: [OPENSEAMAP_URL],
    tileSize: 256,
    attribution: "Sømærker: &copy; <a href='https://www.openseamap.org'>OpenSeaMap</a>, &copy; OpenStreetMap-bidragydere. Ikke til navigation",
    credit: "Sømærker: OpenSeaMap, OpenStreetMap-bidragydere",
    noOffline: true,
    notForNavigation: true,
  },
};

/** Overlays shown in the UI, in order, with their labels. */
export const OVERLAY_LABELS: Record<OverlayId, string> = {
  contours: "Højdekurver (0,5 m)",
  contours25: "Højdekurver (2,5 m, roligere)",
  hillshade: "Skyggekort (terræn)",
  stednavne: "Stednavne",
  matrikel: "Matrikelskel",
  havdybder: "Havdybder (EMODnet)",
  soemaerker: "Sømærker (OpenSeaMap)",
};

export const SEA_OVERLAYS: readonly OverlayId[] = ["havdybder", "soemaerker"];
