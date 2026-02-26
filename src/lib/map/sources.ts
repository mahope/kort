import type { OverlayId } from "@/types/map";
import { DATAFORSYNINGEN_TOKEN } from "./styles";

/**
 * Ortofoto WMTS tile URL template.
 * Uses DFD_GoogleMapsCompatible TileMatrixSet (EPSG:3857).
 */
export const ORTOFOTO_TILES_URL =
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
export const DHM_CONTOURS_URL =
  `${DHM_WMS_BASE}&LAYERS=dhm_kurve_0_5_m&BBOX={bbox-epsg-3857}`;

/**
 * DHM Hillshade (terrain shadow) WMS tile URL.
 */
export const DHM_HILLSHADE_URL =
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
}

export const ORTOFOTO_SOURCE: RasterSourceConfig = {
  tiles: [ORTOFOTO_TILES_URL],
  tileSize: 256,
  attribution: "&copy; Klimadatastyrelsen",
};

export const DTK25_SOURCE: RasterSourceConfig = {
  tiles: [DTK25_TILES_URL],
  tileSize: 256,
  attribution: "&copy; Klimadatastyrelsen (DTK25)",
};

export const OSM_SOURCE: RasterSourceConfig = {
  tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  tileSize: 256,
  attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
};

export const OVERLAY_SOURCES: Record<OverlayId, RasterSourceConfig> = {
  contours: {
    tiles: [DHM_CONTOURS_URL],
    tileSize: 256,
    attribution: "&copy; Klimadatastyrelsen (DHM)",
  },
  hillshade: {
    tiles: [DHM_HILLSHADE_URL],
    tileSize: 256,
    attribution: "&copy; Klimadatastyrelsen (DHM)",
  },
};
