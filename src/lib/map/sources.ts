import type { BaseLayer, MapStyle, OverlayId } from "@/types/map";
import { DATAFORSYNINGEN_TOKEN, MAP_STYLES } from "./styles";
import { soekortDataUrl, type VectorOverlayKind } from "./vectorOverlays";
import { buildSoekortStyle } from "./soekort/style";

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

/**
 * The DDM50 terms themselves (PDF, May 2024). They say a copy must be made
 * available to third parties, e.g. by a link, so screen and /kilder link the
 * document. The PDF prints the agency's short page address instead (the terms
 * PDF is the first link there): the document URL is 190 characters of %-codes.
 */
export const DDM_TERMS_URL =
  "https://dataforsyningen.dk/asset/PDF/rettigheder_vilkaar/Vilk%C3%A5r%20og%20betingelser%20for%20brug%20af%20marine%20data%20indeholdt%20i%20Danmarks%20Dybdemodel%2050%20m%20opl%C3%B8sning.pdf";
export const DDM_TERMS_PAGE_URL =
  "https://gst.dk/ansvarsomraader/soekort-og-marine-data/soeopmaaling-og-dybdedata/danmarks-dybdemodel";

/** The three items Geodatastyrelsen's DDM50 terms (May 2024) require, plus the terms link. */
const DDM_ATTRIBUTION = `Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning. Indeholder WMS-tjeneste (<a href='${DDM_TERMS_URL}'>vilkår</a>). Model og data er ikke egnet til navigation`;
const DDM_CREDIT = `Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning. Indeholder WMS-tjeneste. Model og data er ikke egnet til navigation. Vilkår: ${DDM_TERMS_PAGE_URL}`;

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

/** One style object per scale, so the live map gets the same object on every render. */
const soekortStyles = new Map<number, ReturnType<typeof buildSoekortStyle>>();
function soekortStyle(pxPerMm: number | undefined) {
  const key = pxPerMm ?? 0;
  let s = soekortStyles.get(key);
  if (!s) {
    s = pxPerMm === undefined ? buildSoekortStyle() : buildSoekortStyle(pxPerMm);
    soekortStyles.set(key, s);
  }
  return s;
}

/**
 * The style for a base map. `pxPerMm` sizes the vector sea chart's lines and
 * text for the target (the PDF passes its print scale; default is the screen).
 */
export function getBaseMapStyle(baseLayer: BaseLayer, style: MapStyle, pxPerMm?: number) {
  if (baseLayer === "skaermkort") return MAP_STYLES[style].url;
  if (baseLayer === "soekort") return soekortStyle(pxPerMm);
  return baseLayer === "none" ? NO_BASE_STYLE : RASTER_STYLE;
}

/** Base maps that are sea charts: the navigation warning shows with them as with the sea overlays. */
export function isSeaBaseLayer(baseLayer: BaseLayer): boolean {
  return baseLayer === "soekort";
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
  /** Our own GeoJSON snapshot (public/data/soekort, see vectorOverlays.ts) instead of raster tiles. */
  vector?: VectorOverlayKind;
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
  // Vector snapshots from public/data/soekort: `tiles` is unused, the layers come from vectorOverlays.ts.
  soedybder: {
    tiles: [soekortDataUrl("soedybder")],
    tileSize: 512,
    vector: "soedybder",
    attribution:
      "Sødybder: <a href='https://arealdata.miljoeportal.dk/'>Danmarks Miljøportal</a> (NOVANA). Indeholder data, som benyttes i henhold til <a href='https://miljoeportal.dk/dataansvar/vilkaar-for-brug/'>vilkår for brug af danske offentlige data</a>. Ikke til navigation",
    credit:
      "Sødybder: Miljøstyrelsen/Danmarks Miljøportal (NOVANA), forenklet af kort.mahoje.dk. Indeholder data, som benyttes i henhold til vilkår for brug af danske offentlige data",
    noOffline: true,
    notForNavigation: true,
  },
  indsoekort: {
    tiles: [soekortDataUrl("indsoekort")],
    tileSize: 512,
    vector: "indsoekort",
    attribution: `Historiske indsøkort: &copy; Geodatastyrelsen (Thorkild Høy m.fl.), <a href='${KDS_LICENCE_URL}'>CC BY 4.0</a>. Historiske kort, ikke til navigation`,
    credit: "Historiske indsøkort: Geodatastyrelsen (Thorkild Høy m.fl.), CC BY 4.0. Historiske kort, ikke egnet til navigation",
    noOffline: true,
    notForNavigation: true,
  },
  vrag: {
    tiles: [soekortDataUrl("vrag")],
    tileSize: 512,
    vector: "vrag",
    attribution:
      "Vrag: <a href='https://emodnet.ec.europa.eu/en/human-activities'>EMODnet Human Activities</a> (CC BY 4.0), data fra UK Hydrographic Office (<a href='https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'>OGL v3.0</a>). Ikke til navigation",
    credit:
      "Vrag: EMODnet Human Activities (CC BY 4.0). Indeholder data fra UK Hydrographic Office, Open Government Licence v3.0",
    noOffline: true,
    notForNavigation: true,
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
  soedybder: "Sødybder (dybdekurver i 80 søer)",
  indsoekort: "Historiske indsøkort (dybdekort over søer som bilag)",
  vrag: "Skibsvrag (EMODnet)",
};

/** The warning on every sea and lake layer, on screen and on the PDF. */
export const NAVIGATION_WARNING = "Må ikke bruges til navigation. Brug officielle søkort.";

/** Under the warning: what the map is for, in our own words (like marinekort.dk's note). */
export const SEA_DATA_NOTE =
  "Havets og søernes data er bearbejdet og forenklet til kortet. Kortet er til orientering og turplanlægning.";

export const SEA_OVERLAYS: readonly OverlayId[] = [
  "dybdemodel",
  "havbund",
  "havdybder",
  "soemaerker",
  "soedybder",
  "indsoekort",
  "vrag",
];
