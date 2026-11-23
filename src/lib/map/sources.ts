import type { BaseLayer, MapStyle, OverlayId } from "@/types/map";
import type { MapRegion } from "@/lib/geo/regions";
import { DATAFORSYNINGEN_TOKEN, MAP_STYLES } from "./styles";
import { soekortDataUrl, type VectorOverlayKind } from "./vectorOverlays";
import { SOEKORT_SRCS, SOEKORT_URL, type SoekortSrc } from "./soekortStyle";
import { getBrand } from "@/config/brand";
import { DENMARK_TILE_BOUNDS, tileRouteTemplate } from "@/lib/tiles/routeLayers";

/**
 * The Danish raster layers come through our own tile route (/api/tiles), which
 * adds the Datafordeler API key on the server and sets cache headers; without
 * a key it serves the same tiles from Dataforsyningen (src/lib/tiles/upstream.ts).
 * MapLibre, the offline cache and the service worker need absolute URLs: the
 * page's own origin in the browser, the brand's elsewhere (server, tests).
 */
const TILE_ORIGIN = typeof window !== "undefined" ? window.location.origin : getBrand().baseUrl;

/** Ortofoto (WMTS, DFD_GoogleMapsCompatible, JPEG). */
const ORTOFOTO_TILES_URL = tileRouteTemplate(TILE_ORIGIN, "ortofoto", "jpg");

/** DTK 25 (topografisk kort 1:25.000), transparent PNG for the PDF. */
export const DTK25_TILES_URL = tileRouteTemplate(TILE_ORIGIN, "dtk25", "png");

/**
 * DTK 25 for on-screen use: the layer is opaque, so JPEG is 7-13x smaller than
 * PNG. The PDF renderer keeps using DTK25_TILES_URL (PNG) for full quality.
 */
const DTK25_SCREEN_TILES_URL = tileRouteTemplate(TILE_ORIGIN, "dtk25", "jpg");

/** Høje Målebordsblade (1842-1899). */
const HISTORISK_HOEJE_TILES_URL = tileRouteTemplate(TILE_ORIGIN, "historisk_hoeje", "png");

/** Lave Målebordsblade (1901-1971). */
const HISTORISK_LAVE_TILES_URL = tileRouteTemplate(TILE_ORIGIN, "historisk_lave", "png");

/** Danske Stednavne. */
const STEDNAVNE_TILES_URL = tileRouteTemplate(TILE_ORIGIN, "stednavne", "png");

/**
 * Matrikelskel WMS tile URL. Geodatastyrelsen's cadastre, on Dataforsyningen's
 * `wms/forvaltning2` (forvaltning2_udv closes on 26 Nov 2026; same layer and tiles).
 */
const MATRIKEL_TILES_URL =
  `https://api.dataforsyningen.dk/wms/forvaltning2?` +
  `service=WMS&version=1.1.1&request=GetMap` +
  `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256` +
  `&LAYERS=Matrikelskel&STYLES=default` +
  `&TRANSPARENT=TRUE&FORMAT=image/png` +
  `&token=${DATAFORSYNINGEN_TOKEN}` +
  `&BBOX={bbox-epsg-3857}`;

/** DHM (Danmarks Højdemodel) contour lines, 0.5 m. */
const DHM_CONTOURS_URL = tileRouteTemplate(TILE_ORIGIN, "contours", "png");

/**
 * DHM "traditionel" contours: 2.5 m interval, heavily smoothed for 1:25.000.
 * Much calmer on a 1:25.000 print than the 0.5 m lines.
 */
const DHM_CONTOURS_25_URL = tileRouteTemplate(TILE_ORIGIN, "contours25", "png");

/**
 * Danmarks Dybdemodel 2024, 50 m (Geodatastyrelsen): free to copy, publish and
 * use commercially, with the credit, a link to the terms and "not for
 * navigation". Covers Danish waters only; EMODnet covers the rest.
 *
 * `ddm_50m_dybde` is the plain light-to-dark blue depth ramp. The service's
 * `ddm_50m_dybde_relief` bakes the grey hillshade into it (black streaks in
 * every channel); the relief is its own layer, `havbund`, instead.
 */
const DDM_DEPTH_URL =
  `https://api.dataforsyningen.dk/wms/ddm?service=WMS&version=1.1.1&request=GetMap` +
  `&LAYERS=ddm_50m_dybde&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE` +
  `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}&token=${DATAFORSYNINGEN_TOKEN}`;

/**
 * Seabed relief from the same model: Geodatastyrelsen's own exaggerated
 * hillshade, grey and transparent over land. Same terms and credit as the
 * depth colours, so the PDF names Dybdemodellen once for both.
 */
const DDM_RELIEF_URL = DDM_DEPTH_URL.replace("LAYERS=ddm_50m_dybde", "LAYERS=ddm_50m_skyggekort_overdrevet");

/**
 * The model's cells are 50 m, about 87 EPSG:3857 metres in Danish latitudes:
 * one pixel of a 256 px tile at zoom 11. The WMS draws the cells as hard
 * squares at any finer zoom, so ask for zoom 11 at most and let MapLibre
 * enlarge it with linear resampling: smooth depths instead of blocks, on
 * screen and in the PDF.
 */
const DDM_MAXZOOM = 11;

/** EMODnet's cells are about 115 m (about 200 EPSG:3857 metres here): zoom 10. */
const EMODNET_MAXZOOM = 10;

/** A little more contrast, so shallow and deep water tell apart over the base map's own blue. */
const DDM_DEPTH_PAINT: RasterSourceConfig["paint"] = {
  "raster-resampling": "linear",
  "raster-contrast": 0.1,
};

/**
 * The exaggerated hillshade is black in steep channels. Lifting the darkest
 * tone to dark grey keeps the seabed shapes but stops them muddying the water;
 * the layer also draws under the depth colours (see mapStore).
 */
const DDM_RELIEF_PAINT: RasterSourceConfig["paint"] = {
  "raster-resampling": "linear",
  "raster-brightness-min": 0.25,
};

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
 * When the Dybdemodel GeoTIFF behind soekort.pmtiles was fetched from
 * Geodatastyrelsen (the build writes the same date into the file's
 * attribution). The DDM50 terms want this date instead of "Indeholder
 * WMS-tjeneste" once the data is downloaded. Update it with every rebuild.
 */
export const SOEKORT_DDM_RETRIEVED = "23.11.2026";

/** Size of the hosted soekort.pmtiles, for the offline estimate (64.584.452 bytes on 23 Nov 2026, with the 4 m level). */
const SOEKORT_BYTES = 64_584_452;

/** Hosts the service worker saves a whole PMTiles file from; the same list as OFFLINE_FILE_HOSTS in public/sw.js. */
export const SOEKORT_OFFLINE_HOSTS = ["tiles.mahoje.dk"];

/**
 * The søkort's offline setting: the whole file when the service worker saves
 * from its host, otherwise not offered offline (another NEXT_PUBLIC_SOEKORT_URL
 * host would only give the base map's tiles).
 */
export function soekortOffline(url: string): { offlineFile: { url: string; bytes: number } } | { noOffline: true } {
  let saved = false;
  try {
    const u = new URL(url);
    saved = u.protocol === "https:" && SOEKORT_OFFLINE_HOSTS.includes(u.hostname) && u.pathname.endsWith(".pmtiles");
  } catch {
    // Not an absolute URL: nothing the service worker would save.
  }
  return saved ? { offlineFile: { url, bytes: SOEKORT_BYTES } } : { noOffline: true };
}

const SOEKORT_DDM_TEXT =
  `Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning, hentet ${SOEKORT_DDM_RETRIEVED}`;
const DDM_NOT_FOR_NAVIGATION = "Model og data er ikke egnet til navigation";
const NOVANA_TERMS_URL = "https://miljoeportal.dk/dataansvar/vilkaar-for-brug/";
const NOVANA_TERMS_TEXT = "Indeholder data, som benyttes i henhold til vilkår for brug af danske offentlige data";

/** PDF credit per source in soekort.pmtiles; only the sources in the frame are printed. */
export const SOEKORT_CREDITS: Record<SoekortSrc, string> = {
  ddm: `Dybder: ${SOEKORT_DDM_TEXT}. ${DDM_NOT_FOR_NAVIGATION}. Vilkår: ${DDM_TERMS_PAGE_URL}. Dybdekurver og -tal beregnet af kort.mahoje.dk`,
  emodnet: "Dybder: EMODnet Bathymetry (CC BY 4.0)",
  novana: `Sødybder: Miljøstyrelsen/Danmarks Miljøportal (NOVANA), bearbejdet af kort.mahoje.dk. ${NOVANA_TERMS_TEXT}`,
};

/**
 * The PDF credits for the depth sources a print shows (`shown`, from the
 * rendered tiles), in a fixed order. Unknown (`undefined`): all of them.
 */
export function soekortCredits(shown?: ReadonlySet<string>): string[] {
  return SOEKORT_SRCS.filter((src) => !shown || shown.has(src)).map((src) => SOEKORT_CREDITS[src]);
}

/** On the map: all three sources, the DDM download date, not for navigation and the DDM terms link. */
const SOEKORT_ATTRIBUTION =
  `Dybder: ${SOEKORT_DDM_TEXT} (<a href='${DDM_TERMS_URL}'>vilkår</a>). ${DDM_NOT_FOR_NAVIGATION}` +
  ` &middot; <a href='https://emodnet.ec.europa.eu/en/bathymetry'>EMODnet Bathymetry</a> (CC BY 4.0)` +
  ` &middot; Sødybder: <a href='https://arealdata.miljoeportal.dk/'>Danmarks Miljøportal</a> (NOVANA). Indeholder data, som benyttes i henhold til <a href='${NOVANA_TERMS_URL}'>vilkår for brug af danske offentlige data</a>`;

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

/** DHM hillshade (terrain shadow). */
const DHM_HILLSHADE_URL = tileRouteTemplate(TILE_ORIGIN, "hillshade", "png");

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
  paint?: {
    "raster-hue-rotate"?: number;
    "raster-saturation"?: number;
    "raster-contrast"?: number;
    "raster-brightness-min"?: number;
    "raster-resampling"?: "linear" | "nearest";
  };
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
  /** Our own depth tiles (PMTiles, see soekortStyle.ts) instead of raster tiles. */
  soekort?: true;
  /**
   * One whole file the offline cache saves instead of tiles (a PMTiles archive
   * the service worker answers range requests from), with its size in bytes.
   */
  offlineFile?: { url: string; bytes: number };
  /** [west, south, east, north]: MapLibre requests no tiles outside it. */
  bounds?: [number, number, number, number];
  /**
   * Print tiles for a given paper resolution (dpi), for WMS servers that scale
   * their symbols and pick their data by it. Without it the PDF uses `tiles`.
   */
  printTiles?: (dpi: number) => string[];
  /** Highest tile zoom the PDF requests at this paper resolution; MapLibre enlarges above it. */
  printMaxzoom?: (dpi: number) => number;
  /**
   * Lowest map zoom the layer is drawn at on screen (96 dpi). The PDF draws it
   * from the same paper scale: its zoom is higher by log2(dpi / 96).
   */
  minzoom?: number;
}

/** The tile templates the PDF requests for a source at this paper resolution. */
export function printTilesFor(cfg: RasterSourceConfig, dpi: number): string[] {
  return cfg.printTiles ? cfg.printTiles(dpi) : cfg.tiles;
}

/** `{ maxzoom }` for the PDF at this paper resolution: `printMaxzoom` when set, else as on screen. */
export function printZoomLimit(cfg: RasterSourceConfig, dpi: number): { maxzoom?: number } {
  return cfg.printMaxzoom ? { maxzoom: cfg.printMaxzoom(dpi) } : sourceZoomLimit(cfg);
}

/** `{ minzoom }` for the layer: as set for the screen, or for the same paper scale at `dpi`. */
export function layerMinzoom(cfg: RasterSourceConfig, dpi = 96): { minzoom?: number } {
  return cfg.minzoom === undefined ? {} : { minzoom: cfg.minzoom + Math.log2(dpi / 96) };
}

/** `{ maxzoom }` for sources that set one, else nothing (MapLibre rejects `maxzoom: undefined`). */
export function sourceZoomLimit(cfg: RasterSourceConfig): { maxzoom?: number } {
  return cfg.maxzoom === undefined ? {} : { maxzoom: cfg.maxzoom };
}

const ORTOFOTO_SOURCE: RasterSourceConfig = {
  tiles: [ORTOFOTO_TILES_URL],
  bounds: DENMARK_TILE_BOUNDS,
  tileSize: 256,
  attribution: "&copy; Klimadatastyrelsen",
};

export const DTK25_SOURCE: RasterSourceConfig = {
  tiles: [DTK25_TILES_URL],
  bounds: DENMARK_TILE_BOUNDS,
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
  bounds: DENMARK_TILE_BOUNDS,
  tileSize: 256,
  attribution: "&copy; Klimadatastyrelsen (Høje Målebordsblade)",
};

const HISTORISK_LAVE_SOURCE: RasterSourceConfig = {
  tiles: [HISTORISK_LAVE_TILES_URL],
  bounds: DENMARK_TILE_BOUNDS,
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
 * OpenTopoMap (CC-BY-SA, OSM data, SRTM and Sonny heights): topographic style with
 * contours, used for Sweden and as the layer under Kartverket. Free to embed
 * as long as the server is not hammered (opentopomap.org/about#faq), so no
 * offline saving. Lantmäteriet has no free detailed web map (see README).
 */
export const OPENTOPOMAP_SOURCE: RasterSourceConfig = {
  tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
  tileSize: 256,
  maxzoom: 17,
  attribution:
    "Kortdata: &copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>-bidragydere | Højdedata: <a href='https://viewfinderpanoramas.org'>SRTM</a>, <a href='https://sonny.4lima.de/'>Sonny</a> | Kortdesign: &copy; <a href='https://opentopomap.org'>OpenTopoMap</a> (<a href='https://creativecommons.org/licenses/by-sa/3.0/'>CC-BY-SA</a>)",
  credit: "Kortdata: © OpenStreetMap-bidragydere | Højdedata: SRTM, Sonny | Kortdesign: © OpenTopoMap (CC-BY-SA)",
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
    bounds: DENMARK_TILE_BOUNDS,
    tileSize: 256,
    attribution: "&copy; Klimadatastyrelsen (DHM)",
  },
  contours25: {
    tiles: [DHM_CONTOURS_25_URL],
    bounds: DENMARK_TILE_BOUNDS,
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
    bounds: DENMARK_TILE_BOUNDS,
    tileSize: 256,
    attribution: "&copy; Klimadatastyrelsen (DHM)",
  },
  stednavne: {
    tiles: [STEDNAVNE_TILES_URL],
    bounds: DENMARK_TILE_BOUNDS,
    tileSize: 256,
    attribution: "&copy; Klimadatastyrelsen (Stednavne)",
  },
  matrikel: {
    tiles: [MATRIKEL_TILES_URL],
    tileSize: 256,
    // The cadastre (MAT) is Geodatastyrelsen's: its terms ask for that credit, not KDS's.
    attribution: `&copy; Geodatastyrelsen (Matrikelskel), <a href='${KDS_LICENCE_URL}'>CC BY 4.0</a>`,
    credit: "Matrikelskel: Geodatastyrelsen, CC BY 4.0",
  },
  dybdemodel: {
    tiles: [DDM_DEPTH_URL],
    tileSize: 256,
    maxzoom: DDM_MAXZOOM,
    attribution: DDM_ATTRIBUTION,
    credit: DDM_CREDIT,
    paint: DDM_DEPTH_PAINT,
    // Saved tiles would need a download date in the credit instead of "WMS-tjeneste".
    noOffline: true,
    notForNavigation: true,
  },
  // Vector, from tiles.mahoje.dk: `tiles` is unused, the layers come from soekortStyle.ts.
  soekort: {
    tiles: [],
    tileSize: 512,
    soekort: true,
    attribution: SOEKORT_ATTRIBUTION,
    // The PDF names only the sources in the frame (soekortCredits); this is the main one.
    credit: SOEKORT_CREDITS.ddm,
    // Our own file may be saved: DDM50 may be copied and distributed, and the credit carries the download date.
    ...soekortOffline(SOEKORT_URL),
    notForNavigation: true,
  },
  havbund: {
    tiles: [DDM_RELIEF_URL],
    tileSize: 256,
    maxzoom: DDM_MAXZOOM,
    attribution: DDM_ATTRIBUTION,
    credit: DDM_CREDIT,
    paint: DDM_RELIEF_PAINT,
    noOffline: true,
    notForNavigation: true,
  },
  havdybder: {
    tiles: [EMODNET_DEPTH_URL],
    tileSize: 256,
    maxzoom: EMODNET_MAXZOOM,
    attribution: "Dybder: <a href='https://emodnet.ec.europa.eu/en/bathymetry'>EMODnet Bathymetry</a> (CC BY 4.0)",
    credit: "Dybder: EMODnet Bathymetry (CC BY 4.0)",
    // Red-yellow ramp turned into blue-cyan, toned down so the map stays readable.
    paint: { "raster-hue-rotate": 200, "raster-saturation": -0.3, "raster-resampling": "linear" },
    noOffline: true,
    notForNavigation: true,
  },
  soemaerker: {
    tiles: [OPENSEAMAP_URL],
    maxzoom: 18,
    // OpenSeaMap has no calmer variant. Its zoom-12 tiles pile every harbour's
    // buoys, beacons and light sectors into one clump, so start at zoom 11.5
    // (zoom-13 tiles): about 1:58.000 in a Danish PDF, and as close in on screen.
    minzoom: 11.5,
    tileSize: 256,
    attribution: "Sømærker: &copy; <a href='https://www.openseamap.org'>OpenSeaMap</a>, &copy; OpenStreetMap-bidragydere",
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
  // Vector snapshots from public/data/soekort: `tiles` is unused, the layers come from vectorOverlays.ts.
  soedybder: {
    tiles: [soekortDataUrl("soedybder")],
    tileSize: 512,
    vector: "soedybder",
    attribution:
      "Sødybder: <a href='https://arealdata.miljoeportal.dk/'>Danmarks Miljøportal</a> (NOVANA). Indeholder data, som benyttes i henhold til <a href='https://miljoeportal.dk/dataansvar/vilkaar-for-brug/'>vilkår for brug af danske offentlige data</a>",
    credit:
      "Sødybder: Miljøstyrelsen/Danmarks Miljøportal (NOVANA), forenklet af kort.mahoje.dk. Indeholder data, som benyttes i henhold til vilkår for brug af danske offentlige data",
    noOffline: true,
    notForNavigation: true,
  },
  indsoekort: {
    tiles: [soekortDataUrl("indsoekort")],
    tileSize: 512,
    vector: "indsoekort",
    attribution: `Historiske indsøkort: &copy; Geodatastyrelsen (Thorkild Høy m.fl.), <a href='${KDS_LICENCE_URL}'>CC BY 4.0</a>`,
    credit: "Historiske indsøkort: Geodatastyrelsen (Thorkild Høy m.fl.), CC BY 4.0. Historiske kort, ikke egnet til navigation",
    noOffline: true,
    notForNavigation: true,
  },
  vrag: {
    tiles: [soekortDataUrl("vrag")],
    tileSize: 512,
    vector: "vrag",
    attribution:
      "Vrag: <a href='https://emodnet.ec.europa.eu/en/human-activities'>EMODnet Human Activities</a> (CC BY 4.0), UKHO (<a href='https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'>OGL v3.0</a>)",
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
  soekort: "Søkort (dybder, kurver og tal i hav og søer)",
  dybdemodel: "Havdybder Danmark (Dybdemodel 50 m)",
  havbund: "Havbundens relief (Dybdemodel, skyggekort)",
  havdybder: "Havdybder Europa (EMODnet, grovere)",
  soemaerker: "Sømærker (OpenSeaMap, fra ca. 1:50.000)",
  kurverNorge: "Højdekurver Norge (Kartverket)",
  soedybder: "Sødybder (dybdekurver i 80 søer, mest i Jylland)",
  indsoekort: "Historiske indsøkort (dybdekort over søer som bilag)",
  vrag: "Skibsvrag (EMODnet)",
};

/** The warning on every sea and lake layer, on screen and on the PDF. */
export const NAVIGATION_WARNING = "Må ikke bruges til navigation. Brug officielle søkort.";

/** Under the warning: what the map is for, in our own words (like marinekort.dk's note). */
export const SEA_DATA_NOTE =
  "Havets og søernes data er bearbejdet og forenklet til kortet. Kortet er til orientering og turplanlægning.";

export const SEA_OVERLAYS: readonly OverlayId[] = [
  "soekort",
  "dybdemodel",
  "havbund",
  "havdybder",
  "soemaerker",
  "soedybder",
  "indsoekort",
  "vrag",
];

/**
 * Outside Denmark the Danish base maps have nothing to show, so every base
 * layer except OpenStreetMap (chosen on purpose, covers everything) and
 * "Intet basiskort" becomes the Nordic topographic map. Denmark is untouched.
 */
export function usesNordicTopo(baseLayer: BaseLayer, region: MapRegion): boolean {
  return region === "nordic" && baseLayer !== "osm" && baseLayer !== "none";
}

/**
 * Old layers that `soekort` replaces: an old link (`ov=dd`, `ov=hd`, `ov=sd`)
 * opens the new layer instead, and the menu hides them. The WMS layers stay
 * in the code until the new layer has been checked live.
 */
export const REPLACED_BY_SOEKORT: readonly OverlayId[] = ["dybdemodel", "havdybder", "soedybder"];

/**
 * Whether the menu lists an overlay. The replaced layers are hidden, except
 * EMODnet outside Denmark: soekort.pmtiles stops at 59° N, so the Oslofjord and
 * the Norwegian coast north of it still need the WMS. A layer that is on is
 * always listed, so it can be switched off.
 */
export function overlayInMenu(id: OverlayId, enabled: boolean, region: MapRegion): boolean {
  if (enabled || !REPLACED_BY_SOEKORT.includes(id)) return true;
  return id === "havdybder" && region === "nordic";
}
