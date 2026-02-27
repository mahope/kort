# kort.mahoje.dk

Gratis, moderne webapplikation til udskrivning af danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF - helt uden login.

**Live:** [kort.mahoje.dk](https://kort.mahoje.dk)

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
- **Adressesøgning** - Søg efter adresser og stednavne via DAWA API
- **Bogmærker & historik** - Gem dine yndlingssteder og se tidligere udskrifter
- **Simpel/avanceret tilstand** - Overskuelig for nye brugere, med alle funktioner tilgængelige
- **Mørkt tema** - Light, dark og system-følgende tema
- **Responsivt design** - Desktop sidebar + mobil bottom sheet med snap-points
- **PWA** - Installerbar som app, virker offline med cached tiles
- **Del-funktion** - Del et kortudsnit via URL
- **Ingen login** - Ingen konto, ingen tracking, ingen cookies

## Tech Stack

| Teknologi | Version | Formål |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16 | App Router, Turbopack |
| [React](https://react.dev/) | 19 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.7 | Type safety |
| [MapLibre GL JS](https://maplibre.org/) | 5 | Kortvisning (WebGL) |
| [react-map-gl](https://visgl.github.io/react-map-gl/) | 8 | React bindings til MapLibre |
| [Tailwind CSS](https://tailwindcss.com/) | 4.2 | Styling (CSS-first) |
| [Zustand](https://zustand.docs.pmnd.rs/) | 5 | State management |
| [jsPDF](https://github.com/parallax/jsPDF) | 4 | PDF-generering |
| [Vitest](https://vitest.dev/) | 4 | Unit tests |

## Datakilder

- **Kortdata:** [Dataforsyningen](https://dataforsyningen.dk/) (Klimadatastyrelsen) - Vector tiles i EPSG:3857
- **Adressesøgning:** [DAWA API](https://dawadocs.dataforsyningen.dk/) - Adresser og stednavne
- Alle data er frie offentlige geodata under dansk lovgivning

## Kom i gang

### Forudsætninger

- Node.js 20+
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

### Tests

```bash
npx vitest run
```

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
│   ├── search/           # SearchBar (DAWA autocomplete)
│   ├── print/            # PrintButton
│   └── ui/               # Select, Toggle, BottomSheet, ThemeToggle
├── lib/
│   ├── map/              # Map styles og konfiguration
│   ├── pdf/              # PDF layout, renderer og generator
│   ├── api/              # DAWA API klient
│   ├── geo/              # Geometriske beregninger, UTM
│   └── hooks/            # Custom React hooks
├── stores/               # Zustand stores (map, print, ui, import, draw, history)
├── types/                # TypeScript type-definitioner
└── constants/            # Målestok, papirformater
```

## Arkitektur

- **Kort:** Dataforsyningens vector tiles i Web Mercator (EPSG:3857) renderes direkte i MapLibre GL JS - ingen reprojektion nødvendig
- **PDF:** En skjult MapLibre-instans oprettes ved fuld target-opløsning (300 DPI), renderer tiles, og eksporterer som JPEG til jsPDF
- **Søgning:** Parallel fetch fra DAWA adresse- og stednavne-autocomplete endpoints
- **State:** Zustand stores for kort-state, print-indstillinger og UI-state med localStorage persistence

## Lavet af

Kort.mahoje.dk er bygget af **Mads Holst Jensen**, freelance webudvikler fra Odense med 18+ års erfaring.

Til daglig hjælper jeg virksomheder med WordPress-udvikling, WooCommerce, SEO, sikkerhed, hastighed og AI-optimering via [mahoje.dk](https://mahoje.dk).

## Licens

MIT

## Attribution

Kortdata leveres af [Klimadatastyrelsen](https://www.klimadatastyrelsen.dk/) via [Dataforsyningen](https://dataforsyningen.dk/).
