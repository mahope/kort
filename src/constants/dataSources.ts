import type { BaseLayer, OverlayId } from "@/types/map";
import { DDM_TERMS_URL, KDS_LICENCE_URL, SOEKORT_DDM_RETRIEVED } from "@/lib/map/sources";

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
const SOEKORT_RETRIEVED = "2026-11-18";

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
    provider: "Klimadatastyrelsen via Datafordeleren",
    usedFor: "Standardbasiskortet og det kort, de fleste udskriver.",
    delivery: "WMS (Datafordeleren, DKtopokort/dtk_25, laget dtk25). JPEG på skærmen, PNG til PDF'en for fuld kvalitet. Hentes via sidens egen flise-route (/api/tiles), som sætter API-nøglen på hos serveren; uden nøgle bruges Dataforsyningens tidligere tjeneste.",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["dtk25"],
  },
  {
    id: "ortofoto",
    name: "Ortofoto, forår",
    provider: "Klimadatastyrelsen via Datafordeleren",
    usedFor: "Basiskortet Ortofoto (luftfoto).",
    delivery: "WMTS (Datafordeleren, GeoDanmarkOrto/orto_foraar_webm), JPEG. Hentes via sidens egen flise-route (/api/tiles), som sætter API-nøglen på hos serveren; uden nøgle bruges Dataforsyningens tidligere tjeneste.",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["ortofoto"],
  },
  {
    id: "maalebordsblade",
    name: "Høje og Lave Målebordsblade",
    provider: "Klimadatastyrelsen via Datafordeleren",
    usedFor: "Historiske basiskort (1842-1899 og 1901-1971).",
    delivery: "WMS (Datafordeleren, HoejeMaalebordsblade og LaveMaalebordsblade). Hentes via sidens egen flise-route (/api/tiles), som sætter API-nøglen på hos serveren; uden nøgle bruges Dataforsyningens tidligere tjeneste.",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["historisk_hoeje", "historisk_lave"],
  },
  {
    id: "dhm",
    name: "Danmarks Højdemodel (DHM)",
    provider: "Klimadatastyrelsen via Datafordeleren",
    usedFor: "Højdekurver (0,5 m og 2,5 m) og skyggekort over terrænet.",
    delivery: "WMS (Datafordeleren, DHMNedboer/dhm). Hentes via sidens egen flise-route (/api/tiles), som sætter API-nøglen på hos serveren; uden nøgle bruges Dataforsyningens tidligere tjeneste.",
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
    delivery: "WMS (Datafordeleren, STEDNAVN/Danske_Stednavne) til laget, via sidens egen flise-route (/api/tiles). Søgningen bruger et øjebliksbillede af registeret, som ligger i appen og søges via /api/stednavne.",
    licence: KDS_CC_BY,
    licenceUrl: KDS_LICENCE_URL,
    credit: KDS_CREDIT,
    layers: ["stednavne"],
  },
  {
    id: "matrikel",
    name: "Matrikelkortet (matrikelskel)",
    provider: "Geodatastyrelsen via Dataforsyningen",
    usedFor: "Laget Matrikelskel.",
    delivery: "WMS (wms/forvaltning2, laget Matrikelskel).",
    licence: "CC BY 4.0 (Geodatastyrelsens vilkår for matrikeldata)",
    licenceUrl: KDS_LICENCE_URL,
    // Datafordeler's terms for MAT: "Du skal kreditere Geodatastyrelsen".
    credit:
      "\"© Geodatastyrelsen (Matrikelskel), CC BY 4.0\" i kortets kreditering og \"Matrikelskel: Geodatastyrelsen, CC BY 4.0\" på PDF'en, når laget er slået til.",
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
    delivery:
      "WMS (wms/ddm, lagene ddm_50m_dybde og ddm_50m_skyggekort_overdrevet), hentet i modellens egen opløsning og forstørret glat i appen.",
    licence: "Geodatastyrelsens vilkår for DDM50 (maj 2024): gratis, også kommercielt, men ikke til navigation",
    licenceUrl: DDM_TERMS_URL,
    credit:
      "\"Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning. Indeholder WMS-tjeneste. Model og data er ikke egnet til navigation\", både på kortet og på PDF'en. Vilkårene skal stilles til rådighed: kortet og denne side linker til vilkårsdokumentet, og PDF'en har adressen på Geodatastyrelsens side om Dybdemodellen, hvor dokumentet ligger.",
    layers: ["dybdemodel", "havbund"],
    notForNavigation: true,
  },
  {
    id: "soekort",
    name: "Søkort: dybder, dybdekurver og dybdetal (kort.mahoje.dk)",
    provider:
      "Beregnet af kort.mahoje.dk fra Danmarks Dybdemodel 50 m (Geodatastyrelsen), EMODnet Bathymetry og dybdekortene over danske søer (Miljøstyrelsen, NOVANA)",
    usedFor:
      "Laget Søkort: dybdebånd, dybdekurver og dybdetal i danske farvande (Dybdemodellen), grovere uden for dem (EMODnet, til 59° N) og i 80 søer (NOVANA). To stile: klassisk søkort og lavt vand (bånd ved 1, 2, 3 og 5 m) til kano, kajak og jolle. Dybdebåndene vises kun på Skærmkort; over andre baggrundskort kun kurver og tal.",
    delivery: `Én PMTiles-fil med vektorfliser (tiles.mahoje.dk/soekort.pmtiles), bygget af vores script scripts/soekort/ddm-pmtiles af Dybdemodellens GeoTIFF fra Geodatastyrelsens åbne download, hentet ${SOEKORT_DDM_RETRIEVED}. Filen må gemmes offline.`,
    licence:
      "Geodatastyrelsens vilkår for DDM50 (maj 2024): gratis og i øvrigt ubegrænset brugsret, også kommercielt, men ikke til navigation; EMODnet CC BY 4.0; NOVANA efter vilkår for brug af danske offentlige data",
    licenceUrl: DDM_TERMS_URL,
    credit: `"Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning, hentet ${SOEKORT_DDM_RETRIEVED}. Model og data er ikke egnet til navigation" med link til vilkårene på kortet og her, og med adressen på Geodatastyrelsens side om Dybdemodellen på PDF'en. "EMODnet Bathymetry (CC BY 4.0)" og "Indeholder data, som benyttes i henhold til vilkår for brug af danske offentlige data" (NOVANA). PDF'en nævner kun de kilder, der er data fra inden for udskriften, og skriver "Må ikke bruges til navigation".`,
    layers: ["soekort"],
    notForNavigation: true,
    retrieved: "2026-11-23",
  },
  {
    id: "emodnet",
    name: "EMODnet Bathymetry",
    provider: "EMODnet Bathymetry Consortium (EU)",
    usedFor: "Grovere havdybder uden for danske farvande (ca. 115 m celler).",
    delivery: "WMS (ows.emodnet-bathymetry.eu, emodnet:mean_multicolour), omfarvet til blå i appen.",
    licence: "CC BY 4.0",
    licenceUrl: "https://emodnet.ec.europa.eu/en/terms-use-emodnet-online-services-data-and-data-products",
    credit: "\"Dybder: EMODnet Bathymetry (CC BY 4.0)\" på kortet og PDF'en. Advarslen om navigation står på kortet og PDF'en for alle havlag.",
    layers: ["havdybder"],
    notForNavigation: true,
  },
  {
    id: "openseamap",
    name: "OpenSeaMap sømærker",
    provider: "OpenSeaMap og OpenStreetMap-bidragydere",
    usedFor:
      "Laget Sømærker: bøjer, fyr, båker og andre sømærker. Vises fra ca. 1:50.000, fordi OpenSeaMaps fliser længere ude samler havnenes sømærker i klumper.",
    delivery: "Gennemsigtige PNG-fliser (tiles.openseamap.org). Gemmes aldrig offline, fordi værtens vilkår ikke dækker masse-download.",
    licence: "Kortfliser CC BY-SA 2.0, data ODbL (OpenStreetMap)",
    licenceUrl: "https://www.openstreetmap.org/copyright",
    credit: "\"Sømærker: © OpenSeaMap, © OpenStreetMap-bidragydere\" på kortet og PDF'en.",
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
      "\"Vrag: EMODnet Human Activities (CC BY 4.0). Indeholder data fra UK Hydrographic Office, Open Government Licence v3.0\" på PDF'en og her. Kortet skriver det kort (\"UKHO (OGL v3.0)\") med link til licensen; OGL tillader at linke til kildeangivelsen.",
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
    id: "kartverket",
    name: "Topografisk norgeskart og høydekurver",
    provider: "Kartverket (Norge)",
    usedFor:
      "Basiskortet i Norge: uden for Danmark skifter kortet selv til Kartverkets topografiske kort, når midten af kortet er i Norge. Desuden laget Højdekurver Norge.",
    delivery:
      "WMTS-cache (cache.kartverket.no, laget topo) på skærmen. PDF'en bruger WMS (wms.geonorge.no, wms.topo) i papirets opløsning, så signaturer, tekst og kurver passer til målestokken, men kun Kartverkets egne lag (N50 og grovere): de detaljerede Geovekst-data (FKB) må vises, ikke kopieres, så de kommer hverken i PDF'en eller offline.",
    licence: "CC BY 4.0 (Kartverkets gratisprodukter)",
    licenceUrl: "https://www.kartverket.no/api-og-data/vilkar-for-bruk",
    credit:
      "\"© Kartverket\" med link på kortet, \"Kortdata: Kartverket\" i PDF'ens fod og \"Kort over Norge: © Kartverket (CC BY 4.0)\" i boksen på kortet.",
    layers: ["kurverNorge"],
  },
  {
    id: "ssr",
    name: "Sentralt stedsnavnregister (SSR)",
    provider: "Kartverket (Norge)",
    usedFor: "Søgning efter norske stednavne (fjelde, søer, dale, byer).",
    delivery: "JSON-API (api.kartverket.no/stedsnavn) direkte fra browseren, kun mens du søger.",
    licence: "CC BY 4.0 (Kartverkets gratisprodukter)",
    licenceUrl: "https://www.kartverket.no/api-og-data/vilkar-for-bruk",
    credit: "Kartverket krediteres på denne side; søgeresultater vises ikke på kortet eller i PDF'en.",
  },
  {
    id: "opentopomap",
    name: "OpenTopoMap",
    provider: "OpenTopoMap, OpenStreetMap-bidragydere, SRTM og Sonny (højdedata)",
    usedFor:
      "Basiskortet i Sverige og under Kartverkets kort langs grænsen. Lantmäteriet har ikke et gratis detaljeret webkort (se README).",
    delivery:
      "PNG-fliser fra tile.opentopomap.org (til zoom 17). Gemmes aldrig offline, fordi værten beder om, at serveren ikke belastes med masse-download.",
    licence: "Kortfliser CC-BY-SA, data ODbL (OpenStreetMap)",
    licenceUrl: "https://opentopomap.org/about",
    credit:
      "\"Kortdata: © OpenStreetMap-bidragydere | Højdedata: SRTM, Sonny | Kortdesign: © OpenTopoMap (CC-BY-SA)\" på kortet og i boksen på PDF'en.",
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
