import type { BaseLayer, MapStyle, OverlayId } from "@/types/map";
import type { MapRegion } from "@/lib/geo/regions";
import { DATAFORSYNINGEN_TOKEN, MAP_STYLES } from "./styles";

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
 * Danmarks Dybdemodel 2024, 50 m (Geodatastyrelsen): free to copy, publish and
 * use commercially, with the credit, a link to the terms and "not for
 * navigation". The relief style is already blue, so no paint is needed.
 * Covers Danish waters only; EMODnet covers the rest.
 */
const DDM_DEPTH_URL =
  `https://api.dataforsyningen.dk/wms/ddm?service=WMS&version=1.1.1&request=GetMap` +
  `&LAYERS=ddm_50m_dybde_relief&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE` +
  `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}&token=${DATAFORSYNINGEN_TOKEN}`;

/**
 * Seabed relief from the same model: Geodatastyrelsen's own exaggerated
 * hillshade, grey and transparent over land. Same terms and credit as the
 * depth colours, so the PDF names Dybdemodellen once for both.
 */
const DDM_RELIEF_URL = DDM_DEPTH_URL.replace("LAYERS=ddm_50m_dybde_relief", "LAYERS=ddm_50m_skyggekort_overdrevet");

export const DDM_TERMS_URL =
  "https://gst.dk/ansvarsomraader/soekort-og-marine-data/soeopmaaling-og-dybdedata/danmarks-dybdemodel";

/** The three items Geodatastyrelsen's DDM50 terms (May 2024) require, plus the terms link. */
const DDM_ATTRIBUTION = `Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning. Indeholder WMS-tjeneste (<a href='${DDM_TERMS_URL}'>vilkår</a>). Model og data er ikke egnet til navigation`;
const DDM_CREDIT = `Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning. Indeholder WMS-tjeneste. Model og data er ikke egnet til navigation. Vilkår: ${DDM_TERMS_URL}`;

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
 * Klimadatastyrelsen's free data is CC BY 4.0 since 16 May 2024: credit the
 * agency and name the licence. One line covers every KDS layer on screen and
 * in the PDF; the sources page (/kilder) lists the datasets.
 */
export const KDS_LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/deed.da";
export const SOURCES_PAGE_PATH = "/kilder";
export const KDS_MAP_ATTRIBUTION =
  `&copy; <a href='https://dataforsyningen.dk/data'>Klimadatastyrelsen</a>, <a href='${KDS_LICENCE_URL}'>CC BY 4.0</a>` +
  ` &middot; <a href='${SOURCES_PAGE_PATH}'>Datakilder</a>`;

/** PDF footer: KDS credit, licence and where the full list of sources is. */
export function kdsPrintCredit(domain: string): string {
  return `Kortdata: Klimadatastyrelsen, CC BY 4.0 | Kilder: ${domain}${SOURCES_PAGE_PATH}`;
}

/** On-map credit outside Denmark: the sources carry their own, plus the sources page. */
export const NORDIC_MAP_ATTRIBUTION = `<a href='${SOURCES_PAGE_PATH}'>Datakilder</a>`;

/** PDF footer outside Denmark: who made the map data shown, and where the sources are listed. */
export function nordicPrintCredit(dataCredit: string, domain: string): string {
  return `${dataCredit} | Kilder: ${domain}${SOURCES_PAGE_PATH}`;
}

function blankStyle(backgroundColor: string) {
  return {
    version: 8 as const,
    glyphs: "https://cdn.dataforsyningen.dk/assets/vector_tiles_assets/latest/glyphs/{fontstack}/{range}.pbf",
    sources: {},
    layers: [
      {
        id: "background",
        type: "background" as const,
        paint: { "background-color": backgroundColor },
      },
    ],
  };
}

const RASTER_STYLE = blankStyle("#f0f0f0");
const NO_BASE_STYLE = blankStyle("#ffffff");

/** `nordic`: the Nordic topo replaces the base (see usesNordicTopo), drawn on the raster background. */
export function getBaseMapStyle(baseLayer: BaseLayer, style: MapStyle, nordic = false) {
  if (nordic) return RASTER_STYLE;
  if (baseLayer === "skaermkort") return MAP_STYLES[style].url;
  return baseLayer === "none" ? NO_BASE_STYLE : RASTER_STYLE;
}

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
  /** Our own vector contours (PMTiles, see contours.ts) instead of raster tiles. */
  contourInterval?: 5 | 10;
  /** Highest zoom the server has; MapLibre enlarges these tiles above it instead of failing on 404. */
  maxzoom?: number;
  /** [west, south, east, north]: MapLibre requests no tiles outside it. */
  bounds?: [number, number, number, number];
  /**
   * Print tiles for a given paper resolution (dpi), for WMS servers that scale
   * their symbols and pick their data by it. Without it the PDF uses `tiles`.
   */
  printTiles?: (dpi: number) => string[];
  /** Highest tile zoom the PDF requests at this paper resolution; MapLibre enlarges above it. */
  printMaxzoom?: (dpi: number) => number;
}

/** The tile templates the PDF requests for a source at this paper resolution. */
export function printTilesFor(cfg: RasterSourceConfig, dpi: number): string[] {
  return cfg.printTiles ? cfg.printTiles(dpi) : cfg.tiles;
}

/** `{ maxzoom }` for the PDF at this paper resolution: `printMaxzoom` when set, else as on screen. */
export function printZoomLimit(cfg: RasterSourceConfig, dpi: number): { maxzoom?: number } {
  return cfg.printMaxzoom ? { maxzoom: cfg.printMaxzoom(dpi) } : sourceZoomLimit(cfg);
}

/** `{ maxzoom }` for sources that set one, else nothing (MapLibre rejects `maxzoom: undefined`). */
export function sourceZoomLimit(cfg: RasterSourceConfig): { maxzoom?: number } {
  return cfg.maxzoom === undefined ? {} : { maxzoom: cfg.maxzoom };
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
  maxzoom: 19,
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

/**
 * Kartverket (Norway), open data under CC BY 4.0, no key. The screen uses the
 * WMTS cache; the PDF asks the topo WMS with MAP_RESOLUTION = paper dpi, so
 * MapServer draws symbols, text and the right data set (N50 at 1:25.000) for
 * the paper scale. Both are transparent outside Norway, so OpenTopoMap shows
 * through there.
 *
 * The detailed levels hold Geovekst data (FKB), which the terms let us show
 * but not copy without the rights holders' permission. A PDF is a copy, so
 * the PDF names Kartverket's own layers (the N series, `kd_*`, plus hillshade
 * and depths) instead of `topo`, and never asks for a WMS scale under 1:12.000,
 * where only FKB is drawn: a finer print gets N50 enlarged.
 * Terms: https://www.kartverket.no/api-og-data/vilkar-for-bruk
 */
const KARTVERKET_TOPO_WMTS_URL = "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png";
const KARTVERKET_WMS_BASE =
  "https://wms.geonorge.no/skwms1/wms.topo?service=WMS&version=1.1.1&request=GetMap" +
  "&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE";

function kartverketWms(layers: string, dpi?: number): string {
  // MapServer's resolution parameter; 90.7 dpi (its default) when absent.
  const resolution = dpi ? `&MAP_RESOLUTION=${Math.round(dpi)}` : "";
  return `${KARTVERKET_WMS_BASE}&LAYERS=${layers}${resolution}&BBOX={bbox-epsg-3857}`;
}

/** The children of `topo` that are Kartverket's own data, in its drawing order (no `fkb_*`). */
const KARTVERKET_PRINT_LAYERS = [
  "kd_hoydelag", "kd_arealdekkeflate", "kd_hoydekurver", "fjellskygge", "kd_vannflate", "kd_elver",
  "Dybdelag", "Dybdekontur", "kd_vannkontur", "kd_administrative_grenser", "kd_andre_grenser",
  "kd_verneomradegrense", "kd_veger", "kd_jernbane", "kd_ferger", "kd_anleggslinjer", "kd_bygninger",
  "kd_spesiell_detalj", "kd_hoydepunkt", "kd_jernbanestasjon", "kd_anleggspunkt", "kd_bygningspunkt",
  "kd_turisthytte", "kd_arealdekkepunkt", "kd_tettsted", "kd_stedsnavn",
].join(",");

/** Smallest WMS scale denominator the PDF asks for: the N50 layers end and FKB begins below it. */
const KARTVERKET_MIN_PRINT_SCALE = 12000;

/**
 * Highest tile zoom whose WMS scale stays at or above 1:12.000 at this dpi.
 * MapServer measures 256 px tiles in EPSG:3857 metres at MAP_RESOLUTION.
 */
export function kartverketPrintMaxzoom(dpi: number): number {
  const metresPerPxAtZ0 = 40075016.686 / 256;
  return Math.floor(Math.log2((metresPerPxAtZ0 * dpi) / 0.0254 / KARTVERKET_MIN_PRINT_SCALE));
}

/** Mainland Norway with its waters; the cache has nothing to draw outside. */
const NORWAY_TILE_BOUNDS: [number, number, number, number] = [4.0, 57.8, 31.3, 71.3];

const KARTVERKET_ATTRIBUTION = "&copy; <a href='https://www.kartverket.no/'>Kartverket</a>";

export const KARTVERKET_TOPO_SOURCE: RasterSourceConfig = {
  tiles: [KARTVERKET_TOPO_WMTS_URL],
  printTiles: (dpi) => [kartverketWms(KARTVERKET_PRINT_LAYERS, dpi)],
  printMaxzoom: kartverketPrintMaxzoom,
  tileSize: 256,
  maxzoom: 18,
  bounds: NORWAY_TILE_BOUNDS,
  attribution: KARTVERKET_ATTRIBUTION,
  credit: "Kort over Norge: © Kartverket (CC BY 4.0)",
  // Zoom 12-20 holds Geovekst data that may be shown, not copied: no bulk saving.
  noOffline: true,
};

/**
 * OpenTopoMap (CC-BY-SA, OSM data and SRTM heights): topographic style with
 * contours, used for Sweden and as the layer under Kartverket. Free to embed
 * as long as the server is not hammered (opentopomap.org/about#faq), so no
 * offline saving. Lantmäteriet has no free detailed web map (see README).
 */
export const OPENTOPOMAP_SOURCE: RasterSourceConfig = {
  tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
  tileSize: 256,
  maxzoom: 17,
  attribution:
    "Kortdata: &copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>-bidragydere, SRTM | Kortdesign: &copy; <a href='https://opentopomap.org'>OpenTopoMap</a> (<a href='https://creativecommons.org/licenses/by-sa/3.0/'>CC-BY-SA</a>)",
  credit: "Kortdata: © OpenStreetMap-bidragydere, SRTM | Kortdesign: © OpenTopoMap (CC-BY-SA)",
  noOffline: true,
};

/**
 * The Nordic topographic map, bottom to top: OpenTopoMap everywhere, then
 * Kartverket where it has data (Norway). Used outside Denmark for every base
 * layer except OpenStreetMap, which the user chose on purpose.
 */
export const NORDIC_TOPO_SOURCES: readonly { id: string; cfg: RasterSourceConfig }[] = [
  { id: "nordic-opentopomap", cfg: OPENTOPOMAP_SOURCE },
  { id: "nordic-kartverket", cfg: KARTVERKET_TOPO_SOURCE },
];

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
  // Vector, from tiles.mahoje.dk: `tiles` is unused, the layers come from contours.ts.
  kurver5: {
    tiles: [],
    tileSize: 512,
    attribution: "Højdekurver beregnet fra &copy; Klimadatastyrelsen (DHM)",
    // CC BY: say on the PDF that the lines are derived, not Klimadatastyrelsen's own.
    credit: "Højdekurver beregnet af kort.mahoje.dk fra Klimadatastyrelsens højdemodel (DHM)",
    contourInterval: 5,
    noOffline: true,
  },
  kurver10: {
    tiles: [],
    tileSize: 512,
    attribution: "Højdekurver beregnet fra &copy; Klimadatastyrelsen (DHM)",
    // CC BY: say on the PDF that the lines are derived, not Klimadatastyrelsen's own.
    credit: "Højdekurver beregnet af kort.mahoje.dk fra Klimadatastyrelsens højdemodel (DHM)",
    contourInterval: 10,
    noOffline: true,
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
  dybdemodel: {
    tiles: [DDM_DEPTH_URL],
    tileSize: 256,
    attribution: DDM_ATTRIBUTION,
    credit: DDM_CREDIT,
    // Saved tiles would need a download date in the credit instead of "WMS-tjeneste".
    noOffline: true,
    notForNavigation: true,
  },
  havbund: {
    tiles: [DDM_RELIEF_URL],
    tileSize: 256,
    attribution: DDM_ATTRIBUTION,
    credit: DDM_CREDIT,
    noOffline: true,
    notForNavigation: true,
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
    maxzoom: 18,
    tileSize: 256,
    attribution: "Sømærker: &copy; <a href='https://www.openseamap.org'>OpenSeaMap</a>, &copy; OpenStreetMap-bidragydere. Ikke til navigation",
    credit: "Sømærker: OpenSeaMap, OpenStreetMap-bidragydere",
    noOffline: true,
    notForNavigation: true,
  },
  // Kartverket's contour layers: MapServer picks N50 (20 m) to N2000 by scale,
  // and FKB (5 m, 1 m) only on very large scales. With MAP_RESOLUTION the PDF
  // gets the set for its paper scale; FKB (Geovekst) stays on the screen.
  kurverNorge: {
    tiles: [kartverketWms("kd_hoydekurver,fkb_hoydekurver")],
    printTiles: (dpi) => [kartverketWms("kd_hoydekurver", dpi)],
    printMaxzoom: kartverketPrintMaxzoom,
    tileSize: 256,
    bounds: NORWAY_TILE_BOUNDS,
    attribution: "Højdekurver Norge: " + KARTVERKET_ATTRIBUTION,
    credit: "Højdekurver Norge: © Kartverket (CC BY 4.0)",
    noOffline: true,
  },
};

/** Overlays shown in the UI, in order, with their labels. */
export const OVERLAY_LABELS: Record<OverlayId, string> = {
  contours: "Højdekurver (0,5 m)",
  contours25: "Højdekurver (2,5 m, roligere)",
  kurver5: "Højdekurver (5 m, med tal)",
  kurver10: "Højdekurver (10 m, med tal)",
  hillshade: "Skyggekort (terræn)",
  stednavne: "Stednavne",
  matrikel: "Matrikelskel",
  dybdemodel: "Havdybder Danmark (Dybdemodel 50 m)",
  havbund: "Havbundens relief (Dybdemodel, skyggekort)",
  havdybder: "Havdybder Europa (EMODnet, grovere)",
  soemaerker: "Sømærker (OpenSeaMap)",
  kurverNorge: "Højdekurver Norge (Kartverket)",
};

export const SEA_OVERLAYS: readonly OverlayId[] = ["dybdemodel", "havbund", "havdybder", "soemaerker"];

/**
 * Outside Denmark the Danish base maps have nothing to show, so every base
 * layer except OpenStreetMap (chosen on purpose, covers everything) and
 * "Intet basiskort" becomes the Nordic topographic map. Denmark is untouched.
 */
export function usesNordicTopo(baseLayer: BaseLayer, region: MapRegion): boolean {
  return region === "nordic" && baseLayer !== "osm" && baseLayer !== "none";
}
