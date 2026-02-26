# kort.mahoje.dk

Gratis, moderne webapplikation til udskrivning af danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF - helt uden login.

**Live:** [kort.mahoje.dk](https://kort.mahoje.dk)

## Features

- **Interaktivt kort** - Danske topografiske kort via Dataforsyningens vector tiles (MapLibre GL JS)
- **4 kortstilarter** - Klassisk, Dæmpet, Grå og Mørkt skærmkort
- **6 målestoksforhold** - 1:10.000, 1:25.000, 1:50.000, 1:100.000, 1:250.000, 1:500.000
- **4 papirformater** - A5, A4, A3, A2 i stående eller liggende
- **Print-ramme** - Realtime preview med dimming-mask der viser præcist hvad der udskrives
- **Adressesøgning** - Søg efter adresser og stednavne via DAWA API
- **PDF-generering** - Client-side PDF med målestok-lineal, nordpil og attribution
- **Responsivt design** - Desktop sidebar + mobil bottom sheet
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
│   ├── page.tsx          # Hovedside
│   ├── layout.tsx        # Root layout med metadata
│   └── globals.css       # Tailwind + MapLibre CSS
├── components/
│   ├── map/              # MapContainer, PrintFrame, MapControls, LoadingOverlay
│   ├── sidebar/          # Sidebar, ScaleSelector, PaperFormatSelector
│   ├── search/           # SearchBar (DAWA autocomplete)
│   ├── print/            # PrintButton
│   └── ui/               # Select, Toggle, BottomSheet
├── lib/
│   ├── map/              # Map styles og konfiguration
│   ├── pdf/              # PDF layout, renderer og generator
│   ├── api/              # DAWA API klient
│   ├── geo/              # Geometriske beregninger
│   └── hooks/            # Custom React hooks
├── stores/               # Zustand stores (map, print, ui)
├── types/                # TypeScript type-definitioner
└── constants/            # Målestok, papirformater
```

## Arkitektur

- **Kort:** Dataforsyningens vector tiles i Web Mercator (EPSG:3857) renderes direkte i MapLibre GL JS - ingen reprojektion nødvendig
- **PDF:** En skjult MapLibre-instans oprettes ved fuld target-opløsning (300 DPI), renderer tiles, og eksporterer som JPEG til jsPDF
- **Søgning:** Parallel fetch fra DAWA adresse- og stednavne-autocomplete endpoints
- **State:** Zustand stores for kort-state, print-indstillinger og UI-state

## Licens

MIT

## Attribution

Kortdata leveres af [Klimadatastyrelsen](https://www.klimadatastyrelsen.dk/) via [Dataforsyningen](https://dataforsyningen.dk/).
