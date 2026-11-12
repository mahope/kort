# kort.mahoje.dk

Gratis, moderne webapplikation til udskrivning af danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF - helt uden login.

**Live:** [kort.mahoje.dk](https://kort.mahoje.dk)

[![CI](https://github.com/mahope/kort/actions/workflows/ci.yml/badge.svg)](https://github.com/mahope/kort/actions/workflows/ci.yml)

## Hvorfor?

Jeg er selv spejder og har tit manglet en nem, gratis måde at udskrive et ordentligt topografisk kort. Ofte vil man gerne have et fysisk kort med - til at lære børn at læse kort, til orientering i naturen, eller bare til turen. Der fandtes ikke en god dansk service til det, så jeg byggede en.

Kort.mahoje.dk er gratis og vil altid forblive det.

## Features

- **Interaktivt kort** - Danske topografiske kort via Dataforsyningens vector tiles (MapLibre GL JS)
- **4 kortstilarter** - Klassisk, Dæmpet, Grå og Mørkt skærmkort
- **5 basiskort** - Skærmkort, Ortofoto, OpenStreetMap, Høje & Lave Målebordsblade
- **7 målestoksforhold** - 1:5.000, 1:10.000, 1:25.000, 1:50.000, 1:100.000, 1:250.000, 1:500.000 og valgfri fra 1:1.000 til 1:1.000.000 ("Andet"). Ved 1:5.000 er skærmkort og ortofoto skarpest; topografisk kort 1:25.000 bliver forstørret fem gange
- **6 papirformater** - A5, A4, A3, A2 i stående eller liggende, plus A1 og A0 som ét stort ark til trykkeri/plotter (150 dpi)
- **UTM-gitter** - Grid-linjer og koordinater på kort og PDF, til orientering i felten
- **Overlays** - Højdekurver (0,25 m, 0,5 m og roligere 2,5 m), skyggekort, matrikelskel og stednavne
- **Havlag** - Havdybder i danske farvande fra Danmarks Dybdemodel (Geodatastyrelsen, 50 m), grovere dybder uden for Danmark fra EMODnet Bathymetry (CC BY 4.0) og sømærker (OpenSeaMap). Ikke til navigation: det står i appen og på PDF'en
- **Import** - Indlæs GPX, GeoJSON og KML-filer og print dem direkte
- **Tegning & mål** - Tegn ruter og mål afstande direkte på kortet
- **Multi-page print og gulvkort** - Udskriv store områder over op til 5 × 5 ark med overlap. PDF'en starter med en oversigtsside (arkgitter, samlet størrelse og vejledning), og hvert ark har hjørnemærker, "Ark B2 (side 6 af 10)", en stiplet linje hvor naboarket lægges, og navnene på nabo-arkene i margenen
- **PDF-generering** - Client-side PDF med målestok-lineal, nordpil og attribution
- **Misvisning** - Magnetisk misvisning ved sigtekorset på kortet og som diagram (retvisende, gitter- og magnetisk nord) på PDF'en. Se [Misvisning](#misvisning-magnetic-declination)
- **Kortrotation** - Drej kortet til en valgfri bearing/retning
- **Adressesøgning** - Søg efter adresser (Adressevælger) og stednavne (Danske Stednavne)
- **Bogmærker & historik** - Gem dine yndlingssteder og se tidligere udskrifter
- **Simpel/avanceret tilstand** - Overskuelig for nye brugere, med alle funktioner tilgængelige
- **Mørkt tema** - Light, dark og system-følgende tema
- **Responsivt design** - Desktop sidebar + mobil bottom sheet med snap-points. Kortet centreres over arket, og en søgning zoomer, så hele printrammen ses. Målestok og papir vælges med store knapper, og genveje under "Værktøjer" åbner tegning, GPX, flere ark, deling og offline direkte (se `docs/ux/2026-11-mobil/`)
- **PWA** - Installerbar som app, virker offline med cached tiles
- **Gem området offline** - Under Avanceret kan printrammen (zoom 12-16 plus kant) gemmes, så kortet kan panoreres og zoomes uden net. PDF-generering kræver stadig internet. Se `docs/offline-tests.md`
- **Del-funktion** - Del et kortudsnit via URL
- **Ingen login** - Ingen konto, ingen tracking, ingen cookies

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
- Alle data er frie offentlige geodata under dansk lovgivning

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
│   ├── geo/              # Geometriske beregninger, UTM
│   └── hooks/            # Custom React hooks
├── stores/               # Zustand stores (map, print, ui, import, draw, history)
├── types/                # TypeScript type-definitioner
└── constants/            # Målestok, papirformater
```

## Arkitektur

- **Kort:** Dataforsyningens vector tiles i Web Mercator (EPSG:3857) renderes direkte i MapLibre GL JS - ingen reprojektion nødvendig
- **PDF:** En skjult MapLibre-instans oprettes ved fuld target-opløsning (300 DPI), renderer tiles, og eksporterer som JPEG til jsPDF
- **Søgning:** Parallel fetch fra Adressevælger (adresser) og appens egen `/api/stednavne` (stednavne). DAWA lukker 1. oktober 2026, og der findes ingen officiel live-afløser med fritekstsøgning i stednavne: Gsearch står på Klimadatastyrelsens lukkeliste, og Datafordelerens DS-GraphQL kan kun slå eksakte navne op. Registret Danske Stednavne er ikke opdateret siden september 2025, så et snapshot er lige så aktuelt. Indekset genbygges med `node scripts/build-stednavne-index.mjs <stednavne2.json>`
- **State:** Zustand stores for kort-state, print-indstillinger og UI-state med localStorage persistence

## Lavet af

Kort.mahoje.dk er bygget af **Mads Holst Jensen**, freelance webudvikler fra Odense med 18+ års erfaring.

Til daglig hjælper jeg virksomheder med WordPress-udvikling, WooCommerce, SEO, sikkerhed, hastighed og AI-optimering via [mahoje.dk](https://mahoje.dk).

## Licens

MIT

## Attribution

Kortdata leveres af [Klimadatastyrelsen](https://www.klimadatastyrelsen.dk/) via [Dataforsyningen](https://dataforsyningen.dk/).

## Coordinate grids and point coordinates

Enable **Koordinatgitter**, then choose **UTM** or **MGRS · WGS84**.
MGRS uses standard UTM zones (32 west of 12°E, 33 east of it, including
Copenhagen and Bornholm). Grid lines are clipped at zone boundaries on screen
and in single/multi-page PDFs. The existing Danish UTM zone-32 convention is
still available explicitly. Grid spacing, density guards and heavier 10 km
lines work in both systems. Edge labels include the MGRS 100 km square letters
and the kilometre digits within that square.
At 100 km boundaries, square letters use the line's exact UTM ordinate so
polyline interpolation cannot select the preceding square on screen or in PDFs.

The system choice is stored in localStorage and shared in the `cs=utm|mgrs`
URL parameter. Old `g=1` links still select UTM. Open **Koordinat ved sigtekorset**
and pan the map to read/copy the same centre point as MGRS (1 m and 10 m),
standard-zone UTM and decimal latitude/longitude. This also works on mobile.
The displayed precision describes the coordinate format, not GPS/map accuracy.

MGRS conversion uses pinned `mgrs@2.2.0` from proj4js. Reference tests compare
Rådhuspladsen and Rønne against GeographicLib GeoConvert (WGS84, standard zone).

## Misvisning (magnetic declination)

Misvisningen (vinklen mellem retvisende og magnetisk nord) beregnes i browseren med **World Magnetic Model WMM2025**.

- **Kilde:** NOAA/NCEI og British Geological Survey, [WMM2025COF.zip](https://www.ncei.noaa.gov/sites/default/files/2025-01/WMM2025COF.zip). En uændret kopi af `WMM.COF` ligger i `data/wmm/WMM2025.COF`, og koefficienterne i `src/lib/geo/declination.ts` er overført derfra.
- **Licens:** WMM er udgivet af den amerikanske stat (NOAA) og er offentligt domæne. Ingen npm-pakke og ingen ekstern tjeneste bruges.
- **Gyldighed:** 1/1-2025 til 1/1-2030. Fra 2/7-2029 kl. 12 UTC (de sidste seks måneder) viser appen en advarsel om, at modellen snart udløber. Fra 1/1-2030 vises misvisningen hverken på kortet eller i PDF'en, før `declination.ts` og `data/wmm/` er opdateret med WMM2030 (udgives ved udgangen af 2029).
- **Kontrol:** `src/lib/geo/__tests__/declination.test.ts` sammenligner med NOAA's officielle testværdier (`WMM2025_TEST_VALUES.txt`, afvigelse under 0,02°), kontrollerer at koefficienterne er identiske med `WMM.COF`, og tester datogrænserne.
- **Visning:** "Koordinat ved sigtekorset" viser misvisningen for kortets midte. Diagrammet i PDF'en (nederst til højre i kortet, kan slås fra i sidepanelet under gitterindstillingerne) tegner retvisende nord, magnetisk nord og, når gitteret er slået til, gitternord (meridiankonvergens).
- **Ydelse:** Beregningen hentes først, når den skal bruges (dynamisk import), og ligger ikke i den første bundle.
