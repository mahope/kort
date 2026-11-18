import type { BaseLayer, OverlayId } from "@/types/map";
import { DDM_TERMS_URL, KDS_LICENCE_URL } from "@/lib/map/sources";

/**
 * Every outside data source the site uses, for the /kilder page. A test checks
 * that each base map and overlay is listed here, so a new layer cannot ship
 * without its licence and credit on the page.
 */
export interface DataSource {
  id: string;
  name: string;
  provider: string;
  /** What the site uses it for, in plain Danish. */
  usedFor: string;
  /** How we fetch it (service type and format). */
  delivery: string;
  licence: string;
  licenceUrl: string;
  /** The credit the licence asks for, and where we show it. */
  credit: string;
  /** Base maps and overlays served from this source. */
  layers?: (BaseLayer | OverlayId)[];
  notForNavigation?: boolean;
  /**
   * When our snapshot was fetched (ISO date), shown as "Hentet" on /kilder.
   * Left out where no single date applies (live services, or data built or
   * bundled at another time, see `delivery`).
   */
  retrieved?: string;
}

/** Date of the sea/lake snapshots in public/data/soekort (scripts/soekort/build-soekort-data.mjs). */
export const SOEKORT_RETRIEVED = "2026-11-18";

const KDS_CC_BY = "CC BY 4.0 (frie geografiske data, fra 16. maj 2024)";
const KDS_CREDIT =
  "\"© Klimadatastyrelsen, CC BY 4.0\" i kortets kreditering og \"Kortdata: Klimadatastyrelsen, CC BY 4.0\" i PDF'ens fod.";

export const DATA_SOURCES: DataSource[] = [
  {
    id: "skaermkort",
    name: "Skærmkortet (vector tiles)",
    provider: "Klimadatastyrelsen via Dataforsyningen",
    usedFor: "Basiskortet Skærmkort i fire stilarter, og skrifttyperne til kortets tekster.",
    delivery: "Vector tiles (EPSG:3857) med Klimadatastyrelsens officielle MapLibre-stilarter og glyffer fra cdn.dataforsyningen.dk.",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["skaermkort"],
  },
  {
    id: "dtk25",
    name: "Topografisk kort 1:25.000 (DTK25)",
    provider: "Klimadatastyrelsen via Dataforsyningen",
    usedFor: "Standardbasiskortet og det kort, de fleste udskriver.",
    delivery: "WMS (dtk_25_DAF). JPEG på skærmen, PNG til PDF'en for fuld kvalitet.",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["dtk25"],
  },
  {
    id: "ortofoto",
    name: "Ortofoto, forår",
    provider: "Klimadatastyrelsen via Dataforsyningen",
    usedFor: "Basiskortet Ortofoto (luftfoto).",
    delivery: "WMTS (orto_foraar_webm_DAF), JPEG.",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["ortofoto"],
  },
  {
    id: "maalebordsblade",
    name: "Høje og Lave Målebordsblade",
    provider: "Klimadatastyrelsen via Dataforsyningen",
    usedFor: "Historiske basiskort (1842-1899 og 1901-1971).",
    delivery: "WMS (topo20_hoeje_maalebordsblade_DAF og topo20_lave_maalebordsblade_DAF).",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["historisk_hoeje", "historisk_lave"],
  },
  {
    id: "dhm",
    name: "Danmarks Højdemodel (DHM)",
    provider: "Klimadatastyrelsen via Dataforsyningen",
    usedFor: "Højdekurver (0,5 m og 2,5 m) og skyggekort over terrænet.",
    delivery: "WMS (dhm_DAF).",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["contours", "contours25", "hillshade"],
  },
  {
    id: "kurver",
    name: "Højdekurver 5 og 10 m med højdetal",
    provider: "Beregnet af kort.mahoje.dk fra Klimadatastyrelsens højdemodel (DHM)",
    usedFor: "Rolige højdekurver med tal til print i 1:25.000 og 1:50.000.",
    delivery: "Egne vector tiles i én PMTiles-fil på tiles.mahoje.dk, hentet med HTTP range requests.",
    licence: "CC BY 4.0 (afledt af DHM)",
    licenceUrl: KDS_LICENCE_URL,
    credit:
      "\"Højdekurver beregnet fra © Klimadatastyrelsen (DHM)\" på kortet og \"Højdekurver beregnet af kort.mahoje.dk fra Klimadatastyrelsens højdemodel (DHM)\" på PDF'en. CC BY kræver, at vi siger, at kurverne er bearbejdede.",
    layers: ["kurver5", "kurver10"],
  },
  {
    id: "stednavne",
    name: "Danske Stednavne",
    provider: "Klimadatastyrelsen",
    usedFor: "Stednavnelaget på kortet og stednavnesøgningen.",
    delivery: "WMS (danske_stednavne_DAF) til laget. Søgningen bruger et øjebliksbillede af registeret, som ligger i appen og søges via /api/stednavne.",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["stednavne"],
  },
  {
    id: "matrikel",
    name: "Matrikelkortet (matrikelskel)",
    provider: "Klimadatastyrelsen via Dataforsyningen",
    usedFor: "Laget Matrikelskel.",
    delivery: "WMS (forvaltning2_udv, laget Matrikelskel).",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["matrikel"],
  },
  {
    id: "adressevaelger",
    name: "Adressevælger (Danmarks Adresseregister)",
    provider: "Klimadatastyrelsen",
    usedFor: "Adressesøgningen.",
    delivery: "JSON-API på adressevaelger.dk. Koordinaterne kommer i EPSG:25832 og omregnes til WGS84 i browseren.",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: "Klimadatastyrelsen krediteres på denne side; søgeresultater vises ikke på kortet eller i PDF'en.",
  },
  {
    id: "ddm",
    name: "Danmarks Dybdemodel, 50 m opløsning",
    provider: "Geodatastyrelsen via Dataforsyningen",
    usedFor: "Havdybder i danske farvande og havbundens relief (skyggekort).",
    delivery: "WMS (wms/ddm, lagene ddm_50m_dybde_relief og ddm_50m_skyggekort_overdrevet).",
    licence: "Geodatastyrelsens vilkår for DDM50 (maj 2024): gratis, også kommercielt, men ikke til navigation",
    licenceUrl: DDM_TERMS_URL,
    credit:
      "\"Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning. Indeholder WMS-tjeneste. Model og data er ikke egnet til navigation\", både på kortet og på PDF'en. Vilkårene skal stilles til rådighed: kortet og denne side linker til vilkårsdokumentet, og PDF'en har adressen på Geodatastyrelsens side om Dybdemodellen, hvor dokumentet ligger.",
    layers: ["dybdemodel", "havbund"],
    notForNavigation: true,
  },
  {
    id: "emodnet",
    name: "EMODnet Bathymetry",
    provider: "EMODnet Bathymetry Consortium (EU)",
    usedFor: "Grovere havdybder uden for danske farvande (ca. 115 m celler).",
    delivery: "WMS (ows.emodnet-bathymetry.eu, emodnet:mean_multicolour), omfarvet til blå i appen.",
    licence: "CC BY 4.0",
    licenceUrl: "https://emodnet.ec.europa.eu/en/terms-use-emodnet-online-services-data-and-data-products",
    credit: "\"Dybder: EMODnet Bathymetry (CC BY 4.0). Ikke til navigation\" på kortet og PDF'en.",
    layers: ["havdybder"],
    notForNavigation: true,
  },
  {
    id: "openseamap",
    name: "OpenSeaMap sømærker",
    provider: "OpenSeaMap og OpenStreetMap-bidragydere",
    usedFor: "Laget Sømærker: bøjer, fyr, båker og andre sømærker.",
    delivery: "Gennemsigtige PNG-fliser (tiles.openseamap.org). Gemmes aldrig offline, fordi værtens vilkår ikke dækker masse-download.",
    licence: "Kortfliser CC BY-SA 2.0, data ODbL (OpenStreetMap)",
    licenceUrl: "https://www.openstreetmap.org/copyright",
    credit: "\"Sømærker: © OpenSeaMap, © OpenStreetMap-bidragydere. Ikke til navigation\" på kortet og PDF'en.",
    layers: ["soemaerker"],
    notForNavigation: true,
  },
  {
    id: "soedybder",
    name: "Dybdekort over danske søer (NOVANA)",
    provider: "Miljøstyrelsen (SGAV) via Danmarks Miljøportal (Arealdata)",
    usedFor:
      "Laget Sødybder: dybdekurver for hver hele meter med dybdetal i de 80 søer, der er opmålt i overvågningsprogrammet NOVANA (fx Mossø i Rold Skov og Tjele Langsø). Ikke Furesø og de store søer endnu.",
    delivery:
      "Øjebliksbillede af WFS-laget NOVANA:Soe_dybdekort_konturer (geodata.fvm.dk), forenklet til hele meter (1,5 m tolerance) og lagt som GeoJSON på vores egen server.",
    licence: "Vilkår for brug af danske offentlige data (Danmarks Miljøportal): gratis, må ændres og bruges kommercielt",
    licenceUrl: "https://miljoeportal.dk/dataansvar/vilkaar-for-brug/",
    credit:
      "\"Indeholder data, som benyttes i henhold til vilkår for brug af danske offentlige data\" (den tekst vilkårene kræver) med Miljøportalen og NOVANA på kortet, og at kurverne er forenklet af os på PDF'en. Datasættet må efter Miljøstyrelsens egen beskrivelse ikke bruges til navigation eller sejlads.",
    layers: ["soedybder"],
    notForNavigation: true,
    retrieved: SOEKORT_RETRIEVED,
  },
  {
    id: "indsoekort",
    name: "Historiske indsøkort",
    provider: "Geodatastyrelsen (opmålt af Thorkild Høy 1950-1990 og ældre kort fra Geodætisk Institut)",
    usedFor:
      "Laget Historiske indsøkort: en markør på 231 kort over danske søer (264 skanninger; nogle opmålinger findes i to tryk). Kortene er skannede og ikke georefererede, så de kommer med som ekstra sider bag kortet i PDF'en (højst fire), når søen er inden for udskriften.",
    delivery:
      "Et indeks fra Geodatastyrelsens arkiv (arkivmeta, kortværket Indsøkort) som GeoJSON på vores server. Skanningerne hentes fra historiskekort.dk's billedtjeneste (IIIF) hos Dataforsyningen med det offentlige token.",
    licence: "CC BY 4.0 (Dataforsyningens vilkår)",
    licenceUrl: KDS_LICENCE_URL,
    credit:
      "\"Historiske indsøkort: Geodatastyrelsen (Thorkild Høy m.fl.), CC BY 4.0\" på kortet og PDF'en og på hver bilagsside. Kortene er historiske og ikke egnede til navigation; det står på kortet og øverst på hver bilagsside. Markørens placering kommer fra arkivets metadata og er rettet, hvor den var forkert (Mossø i Rold Skov).",
    layers: ["indsoekort"],
    notForNavigation: true,
    retrieved: SOEKORT_RETRIEVED,
  },
  {
    id: "vrag",
    name: "EMODnet Human Activities: vrag",
    provider: "EMODnet Human Activities (EU), data fra UK Hydrographic Office",
    usedFor:
      "Laget Skibsvrag: kendte vrag i og omkring danske farvande med navn og forlisår, hvor de kendes. Hævede og ikke genfundne vrag er udeladt. Sjovt til poster på vandet, men ikke en sikkerhedsoplysning.",
    delivery:
      "Øjebliksbillede af WFS-laget emodnet:wwshipwrecks (ows.emodnet-humanactivities.eu) som GeoJSON på vores server. EMODnets andet vraglag (kulturarvsvrag) har ingen vrag i Danmark.",
    licence: "CC BY 4.0 (EMODnet); UKHO-data under Open Government Licence v3.0",
    licenceUrl: "https://emodnet.ec.europa.eu/en/terms-use-emodnet-online-services-data-and-data-products",
    credit:
      "\"Vrag: EMODnet Human Activities (CC BY 4.0). Indeholder data fra UK Hydrographic Office, Open Government Licence v3.0\" på kortet og PDF'en.",
    layers: ["vrag"],
    notForNavigation: true,
    retrieved: SOEKORT_RETRIEVED,
  },
  {
    id: "osm",
    name: "OpenStreetMap",
    provider: "OpenStreetMap-bidragydere (OpenStreetMap Foundation)",
    usedFor: "Basiskortet OpenStreetMap.",
    delivery: "PNG-fliser fra tile.openstreetmap.org efter OSMF's Tile Usage Policy.",
    licence: "Data ODbL, kortfliser CC BY-SA 2.0",
    licenceUrl: "https://www.openstreetmap.org/copyright",
    credit: "\"© OpenStreetMap contributors\" med link til ophavsretssiden på kortet og \"Kort: OpenStreetMap-bidragydere (ODbL)\" på PDF'en.",
    layers: ["osm"],
  },
  {
    id: "wmm",
    name: "World Magnetic Model 2025 (WMM2025)",
    provider: "NOAA NCEI og British Geological Survey",
    usedFor: "Misvisningen (magnetisk nord) ved sigtekorset og i PDF'ens diagram.",
    delivery: "Modellens koefficienter ligger i appen og regnes i browseren.",
    licence: "Offentlig ejendom (amerikansk statsværk)",
    licenceUrl: "https://www.ncei.noaa.gov/products/world-magnetic-model",
    credit: "Modellen nævnes ved navn i PDF'ens misvisningsdiagram.",
  },
];

/** Sources we looked at for the sea layers and left out, with the reason (shown on /kilder). */
export const DECLINED_SOURCES: { name: string; reason: string }[] = [
  {
    name: "Officielle søkort (ENC og papir), Geodatastyrelsen",
    reason: "Ophavsretligt beskyttede og sælges; gengivelse kræver en særskilt tilladelse.",
  },
  {
    name: "EMODnet-dybdekurver",
    reason: "Findes kun fra 50 m og dybere og tegnes hvide. Danske farvande er lavere; Dybdemodellen viser dem bedre.",
  },
  {
    name: "Forsvarets skyde- og øvelsesområder",
    reason:
      "Findes som åbne polygoner hos Geodatastyrelsen, men uden angivet licens og uden navne på områderne. Vi venter på en afklaring. Om et område er aktivt, står i Efterretninger for Søfarende.",
  },
  {
    name: "Live-data: AIS, vejr, vandstand og navigationsadvarsler",
    reason: "Hører til en navigationsapp, ikke et udskrevet kort, der er forældet, når det bruges.",
  },
];
