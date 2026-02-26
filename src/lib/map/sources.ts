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
 * DHM (Danmarks Højdemodel) WMS base URL.
 * Used for contours and hillshade overlays.
 */
const DHM_WMS_BASE =
  `https://api.dataforsyningen.dk/dhm_DAF?` +
  `service=WMS&version=1.3.0&request=GetMap` +
  `&crs=EPSG:3857&width=256&height=256` +
  `&format=image/png&transparent=true` +
  `&token=${DATAFORSYNINGEN_TOKEN}`;

/**
 * DHM Contour lines (0.5m) WMS tile URL.
 */
export const DHM_CONTOURS_URL =
  `${DHM_WMS_BASE}&layers=dhm_kurve_0_5_m&bbox={bbox-epsg-3857}`;

/**
 * DHM Hillshade (terrain shadow) WMS tile URL.
 */
export const DHM_HILLSHADE_URL =
  `${DHM_WMS_BASE}&layers=dhm_terraen_skyggekort&bbox={bbox-epsg-3857}`;

/**
 * Minimal blank MapLibre style for use with ortofoto raster base layer.
 */
export const BLANK_STYLE = {
  version: 8 as const,
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
