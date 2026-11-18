# kort.mahoje.dk

Gratis, moderne webapplikation til udskrivning af danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF - helt uden login.

**Live:** [kort.mahoje.dk](https://kort.mahoje.dk)

[![CI](https://github.com/mahope/kort/actions/workflows/ci.yml/badge.svg)](https://github.com/mahope/kort/actions/workflows/ci.yml)

## Hvorfor?

Jeg er selv spejder og har tit manglet en nem, gratis måde at udskrive et ordentligt topografisk kort. Ofte vil man gerne have et fysisk kort med - til at lære børn at læse kort, til orientering i naturen, eller bare til turen. Der fandtes ikke en god dansk service til det, så jeg byggede en.

Kort.mahoje.dk er gratis og vil altid forblive det.

## Features

- **Interaktivt kort** - Danske topografiske kort via Dataforsyningens vector tiles (MapLibre GL JS)
- **Norge og Sverige** - Flyt kortet til Norge eller Sverige, så skifter det selv kilde: Kartverkets topografiske kort i Norge og OpenTopoMap i Sverige. Gitter (UTM 32-35 og MGRS), misvisning, PDF, flere ark og "Intet basiskort" med norske højdekurver virker som i Danmark, og norske stednavne kan søges. Se [Norge og Sverige](#norge-og-sverige)
- **4 kortstilarter** - Klassisk, Dæmpet, Grå og Mørkt skærmkort
- **Basiskort** - Skærmkort, Topografisk kort 1:25.000, Ortofoto, OpenStreetMap, Søkort, Høje & Lave Målebordsblade
- **Søkort** - Eget vektorsøkort over danske farvande: dybdebånd (0-1 til 20-50 m), dybdekurver og dybdetal med decimal som sænket tal ("17₄"), land, by, skov og søer, kystlinje med strandkant, Natura 2000 (stiplet, grønne navne), vrag med navn, lystbådehavne, ankerpladser og sejlrender. Tegnet til print: tekst og streger måles i millimeter på papiret og ser ens ud i 1:25.000 og 1:50.000 ved 150 og 300 dpi. Dybder fra EMODnet Bathymetry (CC BY 4.0), land fra OpenStreetMap (ODbL), Natura 2000 fra Miljøportalen. Bygges med `scripts/soekort-vektor/build-soekort-tiles.sh` til én PMTiles-fil på tiles.mahoje.dk, se [scripts/soekort-vektor/README.md](scripts/soekort-vektor/README.md). "Må ikke bruges til navigation. Brug officielle søkort." står på kortet og PDF'en
- **7 målestoksforhold** - 1:5.000, 1:10.000, 1:25.000, 1:50.000, 1:100.000, 1:250.000, 1:500.000 og valgfri fra 1:1.000 til 1:1.000.000 ("Andet"). Ved 1:5.000 er skærmkort og ortofoto skarpest; topografisk kort 1:25.000 bliver forstørret fem gange
- **6 papirformater** - A5, A4, A3, A2 i stående eller liggende, plus A1 og A0 som ét stort ark til trykkeri/plotter (150 dpi)
- **Koordinatgitter** - UTM, MGRS eller DKTM1-4 (dansk Transversal Mercator) som grid-linjer og koordinater på kort og PDF, til orientering i felten og landmåling
- **Kort til orienteringsløb** - Vælg **Intet basiskort** under **Kortlag → Basiskort**, og slå fx 5 m- eller 10 m-højdekurver til under **Ekstra lag** i samme menu. Kortvisningen og PDF’en får hvid baggrund med de valgte lag. Tilføj gitter eller egne poster efter behov. Under **Alle indstillinger og værktøjer → Udskrivning** kan du vælge målestokslineal og nordpil til eller fra. Uden basiskort er begge slået fra som standard, ligesom misvisningsdiagrammet. Valget følger med i delingslinket.
- **Overlays** - Højdekurver (0,25 m, 0,5 m og roligere 2,5 m fra Dataforsyningen, plus egne 5 og 10 m-kurver med højdetal fra ca. 1:25.000 på skærmen og 1:50.000 på PDF'en; kurverne vises fra zoom 11, ca. 1:80.000 på skærmen), skyggekort, matrikelskel og stednavne
- **Hav- og søkortlag** - Havdybder og havbundens relief (skyggekort) i danske farvande fra Danmarks Dybdemodel (Geodatastyrelsen, 50 m), grovere dybder uden for Danmark fra EMODnet Bathymetry (CC BY 4.0) og sømærker (OpenSeaMap). Til kano, kajak og sejlads også dybdekurver med tal i 80 søer (Miljøstyrelsens NOVANA-opmåling via Danmarks Miljøportal), skibsvrag med navn (EMODnet Human Activities, CC BY 4.0) og Geodatastyrelsens historiske indsøkort (CC BY 4.0): en markør pr. sø på kortet, og de skannede kort kommer med som ekstra sider bag kortet i PDF'en. "Må ikke bruges til navigation. Brug officielle søkort." står i appen, på kortet, på PDF'en og på hver indsøkort-side
- **Import** - Indlæs GPX, GeoJSON og KML-filer og print dem direkte
- **Tegning & mål** - Tegn ruter og mål afstande direkte på kortet
- **Multi-page print og gulvkort** - Udskriv store områder over op til 5 × 5 ark med overlap. PDF'en starter med en oversigtsside (arkgitter, samlet størrelse og vejledning), og hvert ark har hjørnemærker, "Ark B2 (side 6 af 10)", en stiplet linje hvor naboarket lægges, og navnene på nabo-arkene i margenen
- **PDF-generering** - Client-side PDF med målestok-lineal, nordpil og attribution
- **Misvisning** - Magnetisk misvisning ved sigtekorset på kortet og som diagram (retvisende, gitter- og magnetisk nord) på PDF'en. Se [Misvisning](#misvisning-magnetic-declination)
- **Kortrotation** - Drej kortet til en valgfri bearing/retning
- **Adressesøgning** - Søg efter adresser (Adressevælger) og stednavne (Danske Stednavne, og norske stednavne fra Kartverket)
- **Bogmærker & historik** - Gem dine yndlingssteder og se tidligere udskrifter
- **Simpel/avanceret tilstand** - Overskuelig for nye brugere, med alle funktioner tilgængelige
- **Mørkt tema** - Light, dark og system-følgende tema
- **Responsivt design** - Desktop sidebar + mobil bottom sheet med snap-points. Kortet centreres over arket, og en søgning zoomer, så hele printrammen ses. Målestok og papir vælges med store knapper, og genveje under "Værktøjer" åbner tegning, GPX, flere ark, deling og offline direkte (se `docs/ux/2026-11-mobil/`)
- **PWA** - Installerbar som app, virker offline med cached tiles
- **Gem området offline** - Under Avanceret kan printrammen (zoom 12-16 plus kant) gemmes, så kortet kan panoreres og zoomes uden net. PDF-generering kræver stadig internet. Se `docs/offline-tests.md`
- **Del-funktion** - Del et kortudsnit via URL
- **Ingen login** - Ingen konto, ingen tracking, ingen cookies
- **Datakilder** - Siden `/kilder` lister alle datakilder med licens og kreditering og forklarer, hvordan kortet er bygget. Listen står i `src/constants/dataSources.ts`, og en test sikrer, at hvert lag er med

## Tech Stack

| Teknologi | Version | Formål |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16 | App Router, Turbopack |
| [React](https://react.dev/) | 19 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.7 | Type safety |
| [MapLibre GL JS](https://maplibre.org/) | 6 | Kortvisning (WebGL) |
| [react-map-gl](https://visgl.github.io/react-map-gl/) | 8 | React bindings til MapLibre |
| [Tailwind CSS](https://tailwindcss.com/) | 4.2 | Styling (CSS-first) |
| [Zustand](https://zustand.docs.pmnd.rs/) | 5 | State management |
| [jsPDF](https://github.com/parallax/jsPDF) | 4 | PDF-generering |
| [Vitest](https://vitest.dev/) | 4 | Unit tests |

## Datakilder

- **Kortdata:** [Dataforsyningen](https://dataforsyningen.dk/) (Klimadatastyrelsen) - Vector tiles i EPSG:3857
- **Adressesøgning:** [Adressevælger](https://confluence.sdfi.dk/pages/viewpage.action?pageId=234782998) (Klimadatastyrelsen) - adresser og veje, EPSG:25832 konverteres til WGS84
- **Stednavne:** [Danske Stednavne](https://www.klimadatastyrelsen.dk/data/danske-stednavne) (Klimadatastyrelsen) - snapshot i `data/stednavne.tsv.gz`, søges server-side via `/api/stednavne`
- **Norge:** [Kartverket](https://www.kartverket.no/api-og-data/vilkar-for-bruk) - Topografisk norgeskart (WMTS-cache og WMS), høydekurver og stednavne (SSR), CC BY 4.0, ingen nøgle
- **Sverige:** [OpenTopoMap](https://opentopomap.org/about) - OpenStreetMap-data og højdedata fra SRTM og Sonny, CC-BY-SA. Lantmäteriet bruges ikke (se [Norge og Sverige](#norge-og-sverige))
- **Sødybder, vrag og indsøkort-indeks:** øjebliksbilleder i `public/data/soekort/` (hentet 18/11-2026), bygget med `DATAFORSYNINGEN_TOKEN=… node scripts/soekort/build-soekort-data.mjs`. Ret `SOEKORT_RETRIEVED` i `src/constants/dataSources.ts`, når de bygges igen. Skærmbilleder: `node scripts/capture-soekort.mjs` (efter `npm run build`)
- **Søkort (basiskort):** egne vector tiles i `soekort-v1.pmtiles` på tiles.mahoje.dk, bygget med `bash scripts/soekort-vektor/build-soekort-tiles.sh` (Docker, ca. 15 min). Pipeline, kilder, genbygning og upload: [scripts/soekort-vektor/README.md](scripts/soekort-vektor/README.md). Stilens farver og størrelser står i `src/lib/map/soekort/soekort-style.json`. Før/efter-billeder: `node scripts/capture-soekort-vektor.mjs` (efter `npm run build`)
- De danske data er frie offentlige geodata (CC BY 4.0). Alle kilder med licens og kreditering står på `/kilder`

## Kom i gang

### Forudsætninger

- Node.js 22 (som Dockerfile og CI)
- npm

### Installation

```bash
git clone https://github.com/mahoje/kort.git
cd kort
npm install
```

### Udvikling

```bash
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000) i din browser.

### Konfiguration (valgfrit)

Opret en `.env.local` fil for at bruge dit eget Dataforsyningen-token:

```env
NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN=dit_token_her
```

Få et gratis token på [dataforsyningen.dk](https://dataforsyningen.dk/).

### Build

```bash
npm run build
npm start
```

### Tests og kvalitetstjek

```bash
npx vitest run        # tests
npm run lint          # ESLint (autoritet)
npm run lint:fast     # oxlint, hurtigt forhåndstjek (under 1 s)
npm run typecheck     # TypeScript 7 (native tsc), under 3 s
npm run build         # produktionsbuild
```

`typecheck` bruger TypeScript 7 (pakken `typescript7`). Next og typescript-eslint
bruger stadig TypeScript 6 (`typescript`), og `npm run build` typetjekker med den.
`lint:fast` dækker ikke alle `eslint-config-next`-regler og erstatter ikke `npm run lint`.

Ubrugt kode måles med `npx knip@6.44.1` (kør uden for repoet, ingen pakke). `knip.json` ignorerer
de dokumenterede falske positiver: `public/sw.js` (statisk fil, registreres i browseren),
`scripts/**` (manuelle scripts), `tests/e2e/**` og `docs/screenshots/**`.
Sikkerhedspolitik for afhængigheder: [docs/dependency-security.md](docs/dependency-security.md).

## CI

`.github/workflows/ci.yml` kører på hver pull request og på push til `main` (Node 22, npm-cache):
`npm ci --ignore-scripts`, `npm run build`, `npm run lint` og `npx vitest run`. `npm audit --omit=dev --audit-level=high`
kører som separat, ikke-blokerende job. Workflowen deployer ikke; Dokploy deployer selv fra `main`.
Krav: build, lint og tests skal være grønne, og nye eller ændrede afhængigheder skal være pinnede og mindst 3 dage gamle.

## Docker

```bash
docker build -t kort-mahoje .
docker run -p 3000:3000 kort-mahoje
```

Se [Dockerfile](./Dockerfile) for detaljer.

## Projektstruktur

```
src/
├── app/                  # Next.js App Router
│   ├── page.tsx          # Hovedside (kort)
│   ├── om/page.tsx       # Om-side
│   ├── layout.tsx        # Root layout med metadata + OG
│   └── globals.css       # Tailwind + MapLibre CSS
├── components/
│   ├── map/              # MapContainer, PrintFrame, UtmGrid, MapControls
│   ├── sidebar/          # Sidebar, LayerSelector, OverlaySelector, ScaleSelector
│   ├── search/           # SearchBar (adresse- og stednavnesøgning)
│   ├── print/            # PrintButton
│   └── ui/               # Select, Toggle, BottomSheet, ThemeToggle
├── lib/
│   ├── map/              # Map styles og konfiguration
│   ├── pdf/              # PDF layout, renderer og generator
│   ├── api/              # Søgeklient (Adressevælger + /api/stednavne)
│   ├── stednavne/        # Stednavne-indeks, søgning og rate-limit
│   ├── geo/              # Geometriske beregninger, UTM/DKTM
│   └── hooks/            # Custom React hooks
├── stores/               # Zustand stores (map, print, ui, import, draw, history)
├── types/                # TypeScript type-definitioner
└── constants/            # Målestok, papirformater
```

## Arkitektur

- **Kort:** Dataforsyningens vector tiles i Web Mercator (EPSG:3857) renderes direkte i MapLibre GL JS - ingen reprojektion nødvendig
- **PDF:** En skjult MapLibre-instans oprettes ved fuld target-opløsning (300 DPI), renderer tiles, og eksporterer som JPEG til jsPDF. Med laget Historiske indsøkort tilføjes op til fire sider med de skannede indsøkort for søer i udsnittet (hentet fra Dataforsyningens IIIF-billedtjeneste)
- **Egne vektorlag:** Sødybder, vrag og indsøkort-markører er små GeoJSON-filer, som appen selv serverer (`src/lib/map/vectorOverlays.ts`). Stregtykkelser og tekst er angivet i mm på papir, så de ser ens ud på skærm og i 300 dpi
- **Søgning:** Parallel fetch fra Adressevælger (adresser) og appens egen `/api/stednavne` (stednavne). DAWA lukker 1. oktober 2026, og der findes ingen officiel live-afløser med fritekstsøgning i stednavne: Gsearch står på Klimadatastyrelsens lukkeliste, og Datafordelerens DS-GraphQL kan kun slå eksakte navne op. Registret Danske Stednavne er ikke opdateret siden september 2025, så et snapshot er lige så aktuelt. Indekset genbygges med `node scripts/build-stednavne-index.mjs <stednavne2.json>`
- **State:** Zustand stores for kort-state, print-indstillinger og UI-state med localStorage persistence

## Lavet af

Kort.mahoje.dk er bygget af **Mads Holst Jensen**, freelance webudvikler fra Odense med 18+ års erfaring.

Til daglig hjælper jeg virksomheder med WordPress-udvikling, WooCommerce, SEO, sikkerhed, hastighed og AI-optimering via [mahoje.dk](https://mahoje.dk).

## Licens

MIT

## Attribution

Kortdata leveres af [Klimadatastyrelsen](https://www.klimadatastyrelsen.dk/) via [Dataforsyningen](https://dataforsyningen.dk/).
Uden for Danmark: © [Kartverket](https://www.kartverket.no/) (CC BY 4.0) og © [OpenTopoMap](https://opentopomap.org/) (CC-BY-SA) med data fra © OpenStreetMap-bidragydere og højdedata fra SRTM og [Sonny](https://sonny.4lima.de/).

## Norge og Sverige

Kortet vælger selv kilde ud fra midten af kortet (`src/lib/geo/regions.ts`, grove landegrænser fra Natural Earth i
`regionPolygons.ts`, lavet med `scripts/build-region-polygons.mjs`). Er midten i Danmark eller nærmest Danmark, er alt som før.
Er den i Norge eller Sverige, erstattes de danske basiskort af et nordisk topokort: OpenTopoMap nederst og Kartverket ovenpå,
fordi Kartverkets fliser er gennemsigtige uden for Norge. Det giver et sømløst kort hen over grænsen. OpenStreetMap og
"Intet basiskort" bliver, som brugeren har valgt. Et print med flere ark bruger én kilde for alle ark.

| | Skærm | PDF | Licens og kreditering |
| --- | --- | --- | --- |
| Norge | Kartverket WMTS-cache `cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator` | Kartverket WMS `wms.geonorge.no/skwms1/wms.topo` med `MAP_RESOLUTION` = papirets dpi, kun Kartverkets egne lag (`kd_*`, uden FKB) | CC BY 4.0, "© Kartverket" |
| Sverige | OpenTopoMap `tile.opentopomap.org` (til zoom 17) | samme fliser | CC-BY-SA, "Kortdata: © OpenStreetMap-bidragydere \| Højdedata: SRTM, Sonny \| Kortdesign: © OpenTopoMap" |
| Højdekurver Norge | Kartverket WMS (`kd_hoydekurver,fkb_hoydekurver`) | `kd_hoydekurver` med `MAP_RESOLUTION` | CC BY 4.0 |
| Stednavne Norge | `api.kartverket.no/stedsnavn/v1/navn` (kun ved søgning) | - | CC BY 4.0 |

**Hvorfor WMS i PDF'en?** MapServer bag Kartverkets WMS vælger data og signaturstørrelse efter målestokken. Med
`MAP_RESOLUTION=300` regner den med papirets opløsning, så et print i 1:25.000 får N50-kortets 20 m-kurver og tekst i
læsbar størrelse i stedet for de tætte 5 m FKB-kurver, som et 256 px-felt ellers ville udløse. PDF'en henter kun de kilder,
udsnittet kan vise: ingen Kartverket-kald for et print i Sverige, ingen OpenTopoMap-kald midt i Norge.

**Ingen Geovekst-data i PDF'en.** Kartverkets [vilkår](https://www.kartverket.no/api-og-data/vilkar-for-bruk) siger, at
WMS og cache på de detaljerede niveauer viser Geovekst-data (FKB), som må vises, men ikke kopieres uden tilladelse fra
rettighedshaverne. En PDF er en kopi, så PDF'en beder ikke om `topo`, men om Kartverkets egne lag (N50 til N5000, `kd_*`,
plus fjeldskygge og dybder), og aldrig om en WMS-målestok under 1:12.000, hvor kun FKB tegnes. Et print i 1:5.000 eller
1:10.000 i Norge får derfor N50-kortet forstørret, ikke de detaljerede FKB-data, som skærmen viser.

**Kreditering.** På skærmen viser MapLibre kildernes egne tekster plus et link til `/kilder`. I PDF'en står
"Kortdata: Kartverket" og/eller "Kortdata: OpenTopoMap/OpenStreetMap" i foden, og licenslinjerne står i boksen øverst til
venstre på kortet. Hvilke kilder et print viser, afgøres ud fra udsnittet (Kartverket ud til 25 km fra Norge til søs, 3 km over svensk land).

**Gitter og misvisning.** Uden for Danmark følger gitteret altid GPS'ens zoner (32, 33, 34 og 35, også MGRS), uanset valget
"32 – hele Danmark". Ligger et print i zone 33 og dækker svensk land, står der "(= SWEREF 99 TM)" i foden, fordi SWEREF 99 TM
har samme projektion som UTM 33. Misvisningen regnes med WMM2025 for udsnittets midte, så den gælder også i Norge og Sverige.

**Kun højdekurver.** Vælg "Intet basiskort" og slå "Højdekurver Norge (Kartverket)" til. Der findes ikke en fri
højdekurvetjeneste for Sverige; der må man bruge OpenTopoMap, som har kurverne indbygget.

### Begrænsninger

- **Sverige har ikke Lantmäteriets kort.** Det eneste gratis webkort, *Topografisk webbkarta Visning, översiktlig*
  (CC0, kræver et gratis API-token fra Geotorget), går kun til zoom 14 (ca. 10 m pr. pixel), er for groft til print i
  1:25.000 og lukker 31. december 2026 ([Lantmäteriet, 20/5-2026](https://www.lantmateriet.se/sv/geodata/vara-produkter/Produktnyheter/Geografisk-information/avveckling-av-produkten-topografisk-webbkarta-visning-oversiktlig/)).
  Det detaljerede *Topografisk webbkarta Visning, cache* koster penge. Derfor er der ikke bygget et token-proxy-led, og
  intet token skal oprettes. En mulig vej er *Topografisk webbkarta Nedladdning, raster* (gratis under vilkårene for
  värdefulla datamängder), lagt som PMTiles på `tiles.mahoje.dk` ligesom de danske 5/10 m-kurver. Men fra 6. oktober 2026
  hentes produktet kun via et STAC-API, og adgangen bestilles særskilt i [Geotorget](https://geotorget.lantmateriet.se),
  hvor man skal acceptere nye användningsvillkor, fordi Lantmäteriet nu regner dele af indholdet som personoplysninger
  ([Lantmäteriet, 28/9-2026](https://www.lantmateriet.se/sv/geodata/vara-produkter/Produktnyheter/Geografisk-information/nytt-tillhandahallande-av-topografisk-webbkarta-nedladdning-raster/)).
  Før noget bygges, skal Mads oprette kontoen, læse de vilkår og afklare, om de tillader at lægge kortet offentligt ud
  som fliser og printe det. Personoplysninger i et offentligt kort kræver også en GDPR-vurdering. Indtil det er afklaret,
  er vejen ikke bygget.
- **OpenTopoMap** kører på en lille server og beder om, at den ikke belastes med masse-download. Fliserne gemmes derfor
  aldrig offline, og et stort print med mange ark henter mange fliser. Kartverkets fliser gemmes heller ikke offline:
  zoom 12-20 indeholder Geovekst-data, som må vises, men ikke kopieres uden særskilt tilladelse.
- **De danske lag** (Skærmkort-stilarter, ortofoto, DHM-kurver, matrikel, Danske Stednavne) har ingen data uden for Danmark.
  Ortofoto findes ikke gratis for Norge (Norge i bilder kræver aftale) eller Sverige (Ortofoto Visning koster penge).
- **Søgning i Sverige**: Lantmäteriets ortnamn kræver konto og token, og Nominatim tillader ikke søg-mens-du-skriver.
  Svenske steder findes ved at panorere kortet.
- På skærmen viser krediteringen både Kartverket og OpenTopoMap, når man er uden for Danmark, også hvor kun den ene ses.
  PDF'en krediterer præcist.

## Coordinate grids and point coordinates

Enable **Koordinatgitter**, then choose **UTM**, **MGRS · WGS84** or one of
**DKTM1-4 · ETRS89**. MGRS uses standard UTM zones (32 west of 12°E, 33 east
of it, including Copenhagen and Bornholm). Grid lines are clipped at zone
boundaries on screen and in single/multi-page PDFs. The existing Danish UTM
zone-32 convention is still available explicitly. Grid spacing, density
guards and heavier 10 km lines work in all systems. Edge labels include the
MGRS 100 km square letters and the kilometre digits within that square.
At 100 km boundaries, square letters use the line's exact UTM ordinate so
polyline interpolation cannot select the preceding square on screen or in PDFs.

**DKTM1-4** ("Dansk Transversal Mercator", EPSG:4093-4096) are four ETRS89
transverse Mercator zones used in Danish surveying. Unlike UTM's 6° zones,
each DKTM zone is defined to cover the whole country, so its grid is never
split at a zone boundary. Pick the zone that matches the area: DKTM1 for
Jutland west of ~9°45'E, DKTM2 for Jutland east of that plus Funen, DKTM3 for
Zealand and Lolland-Falster, DKTM4 for Bornholm — any zone is mathematically
valid anywhere in Denmark, but accuracy is best close to its own area.
Labels use the same metre-based short/full formatting as UTM.

The system choice is stored in localStorage and shared in the
`cs=utm|mgrs|dktm1|dktm2|dktm3|dktm4` URL parameter. Old `g=1` links still
select UTM. Open **Koordinat ved sigtekorset** and pan the map to read/copy
the same centre point as MGRS (1 m and 10 m), standard-zone UTM and decimal
latitude/longitude; a DKTM row is added there too when a DKTM zone is the
active grid system. This also works on mobile. The displayed precision
describes the coordinate format, not GPS/map accuracy.

MGRS conversion uses pinned `mgrs@2.2.0` from proj4js. Reference tests compare
Rådhuspladsen and Rønne against GeographicLib GeoConvert (WGS84, standard zone).
DKTM1-4 parameters are verified against the EPSG registry (epsg.io/4093-4096);
reference tests compare against PROJ (pyproj) at several Danish towns per zone.

## Misvisning (magnetic declination)

Misvisningen (vinklen mellem retvisende og magnetisk nord) beregnes i browseren med **World Magnetic Model WMM2025**.

- **Kilde:** NOAA/NCEI og British Geological Survey, [WMM2025COF.zip](https://www.ncei.noaa.gov/sites/default/files/2025-01/WMM2025COF.zip). En uændret kopi af `WMM.COF` ligger i `data/wmm/WMM2025.COF`, og koefficienterne i `src/lib/geo/declination.ts` er overført derfra.
- **Licens:** WMM er udgivet af den amerikanske stat (NOAA) og er offentligt domæne. Ingen npm-pakke og ingen ekstern tjeneste bruges.
- **Gyldighed:** 1/1-2025 til 1/1-2030. Fra 2/7-2029 kl. 12 UTC (de sidste seks måneder) viser appen en advarsel om, at modellen snart udløber. Fra 1/1-2030 vises misvisningen hverken på kortet eller i PDF'en, før `declination.ts` og `data/wmm/` er opdateret med WMM2030 (udgives ved udgangen af 2029).
- **Kontrol:** `src/lib/geo/__tests__/declination.test.ts` sammenligner med NOAA's officielle testværdier (`WMM2025_TEST_VALUES.txt`, afvigelse under 0,02°), kontrollerer at koefficienterne er identiske med `WMM.COF`, og tester datogrænserne.
- **Visning:** "Koordinat ved sigtekorset" viser misvisningen for kortets midte. Diagrammet i PDF'en (nederst til højre i kortet, kan slås fra med **Misvisning i printet** ved **Koordinatgitter** i sidepanelet) tegner retvisende nord, magnetisk nord og, når gitteret er slået til, gitternord (meridiankonvergens). Gitternord beregnes ud fra det valgte koordinatgitter (UTM, MGRS eller DKTM1-4) ved midten af hvert kortark.
- **Ydelse:** Beregningen hentes først, når den skal bruges (dynamisk import), og ligger ikke i den første bundle.
