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
- **6 målestoksforhold** - 1:10.000, 1:25.000, 1:50.000, 1:100.000, 1:250.000, 1:500.000
- **4 papirformater** - A5, A4, A3, A2 i stående eller liggende
- **UTM-gitter** - Grid-linjer og koordinater på kort og PDF, til orientering i felten
- **Overlays** - Højdekurver, skyggekort, matrikelskel og stednavne
- **Import** - Indlæs GPX, GeoJSON og KML-filer og print dem direkte
- **Tegning & mål** - Tegn ruter og mål afstande direkte på kortet
- **Multi-page print** - Udskriv store områder over flere sider
- **PDF-generering** - Client-side PDF med målestok-lineal, nordpil og attribution
- **Kortrotation** - Drej kortet til en valgfri bearing/retning
- **Adressesøgning** - Søg efter adresser (Adressevælger) og stednavne (Danske Stednavne)
- **Bogmærker & historik** - Gem dine yndlingssteder og se tidligere udskrifter
- **Simpel/avanceret tilstand** - Overskuelig for nye brugere, med alle funktioner tilgængelige
- **Mørkt tema** - Light, dark og system-følgende tema
- **Responsivt design** - Desktop sidebar + mobil bottom sheet med snap-points
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
