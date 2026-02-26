# TopoPrint.dk - Implementeringsplan

## Tech Stack

| Komponent | Valg | Begrundelse |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | SSR, serverless functions, Vercel-deploy |
| Kort | **MapLibre GL JS** | Open-source, WebGL, smooth, gratis |
| Styling | **Tailwind CSS 4** | Hurtigt, utility-first, dark mode built-in |
| State | **Zustand** | Simpelt, performant, ingen boilerplate |
| PDF | **jsPDF + html2canvas** (client) / **Puppeteer** (server) | Client-first, server som fallback for høj DPI |
| Kortdata | **Dataforsyningen WMTS/WMS** | Gratis, officielle danske kort |
| Adressesøgning | **DAWA API** | Gratis, ingen token, Danmarks adresser |
| Hosting | **Vercel** | Gratis tier, edge functions, CDN |
| Test | **Vitest + Playwright** | Hurtige unit tests + E2E |

---

## Fase 1 - MVP (Fundament + Print)

### 1.1 Projektopsætning
- [ ] Initialiser Next.js 15 med App Router, TypeScript, Tailwind CSS
- [ ] Konfigurer ESLint, Prettier, Vitest
- [ ] Opsæt mappestruktur:
  ```
  src/
    app/              # Next.js routes
      page.tsx         # Hovedside
      api/pdf/         # PDF serverless endpoint
      layout.tsx
    components/
      map/             # Kort-relaterede komponenter
      sidebar/         # Sidebar-panel komponenter
      print/           # Print-preview og PDF
      ui/              # Genbrugelige UI-komponenter
    lib/
      map/             # MapLibre config, tile sources
      pdf/             # PDF-generering logik
      api/             # DAWA og Dataforsyningen klienter
    stores/            # Zustand stores
    types/             # TypeScript typer
    constants/         # Målestok, papirformater, etc.
  ```
- [ ] Opret CLAUDE.md med projektkonventioner
- [ ] Konfigurer Vercel-projekt

### 1.2 Kortvisning (MapLibre GL JS)
- [ ] Opsæt MapLibre GL JS med Dataforsyningens WMTS tiles
  - Hent gratis API-token fra dataforsyningen.dk
  - Konfigurer raster tile source med topografisk kort (topo_skaermkort)
- [ ] Implementer basis kort-kontroller:
  - Zoom in/ud knapper
  - Fullscreen toggle
  - Zoom til Danmark ved load (center: [10.5, 56.0], zoom: 7)
- [ ] Smooth zoom/pan med mouse, touch og scroll
- [ ] Vis målestok-lineal (MapLibre ScaleControl)
- [ ] Vis attribution (Klimadatastyrelsen) - påkrævet

### 1.3 Adressesøgning
- [ ] Søgefelt-komponent med debounced input (300ms)
- [ ] Integration med DAWA API (`https://api.dataforsyningen.dk/adresser/autocomplete`)
- [ ] Dropdown med autocomplete-resultater
- [ ] Ved valg: fly-to animation til adressens koordinat
- [ ] Støt også stednavne via DAWA stednavne-API
- [ ] Keyboard-navigation i dropdown (pil op/ned, enter, escape)

### 1.4 Print-ramme (Preview Rectangle)
- [ ] Beregn print-rammens størrelse ud fra:
  - Valgt papirformat (mm)
  - Valgt målestok (f.eks. 1:25.000)
  - Margin-indstilling
  - → Konverter til meter → konverter til kort-koordinater
- [ ] Tegn rektangel som MapLibre layer (GeoJSON polygon, semi-transparent blå/grøn kant)
- [ ] Drag-to-move: Brugeren kan trække rammen rundt på kortet
- [ ] Rammen centreres automatisk ved zoom/navigation
- [ ] Vis ramme-dimensioner i meter (f.eks. "3.200m × 2.400m")

### 1.5 Sidebar - Målestok
- [ ] Collapsible sidebar (venstre side desktop, bottom sheet mobil)
- [ ] Målestok-sektion med radio buttons / select:
  - 1:10.000 (10 cm kort)
  - 1:25.000 (4 cm kort) ← default
  - 1:50.000 (2 cm kort)
  - 1:100.000
  - 1:250.000
  - 1:500.000
- [ ] Ved ændring: Opdater print-rammens størrelse i realtime
- [ ] Vis forklaring: "4 cm kort - 1 cm = 250 m"

### 1.6 Sidebar - Papirformat
- [ ] Papirformat-sektion:
  - A5 (148 × 210 mm)
  - A4 (210 × 297 mm) ← default
  - A3 (297 × 420 mm)
  - A2 (420 × 594 mm)
- [ ] Orientering toggle: Stående / Liggende
- [ ] Ved ændring: Opdater print-ramme i realtime

### 1.7 PDF-generering
- [ ] "Download PDF" knap med loading-spinner
- [ ] Client-side tilgang (MVP):
  1. Beregn bounding box fra print-rammen
  2. Hent kort-tiles for det specifikke område i korrekt opløsning
  3. Kompositer tiles til ét billede via OffscreenCanvas
  4. Generer PDF med jsPDF:
     - Korrekt sidestørrelse
     - Kort-billede skaleret til præcis målestok
     - Marginer med: nordpil (SVG), målestok-lineal, koordinater for hjørner, dato, "Kilde: Klimadatastyrelsen / Dataforsyningen"
- [ ] Alternativ server-side route (`/api/pdf`) som fallback:
  - Modtag bounding box, målestok, format, DPI
  - Render via headless browser eller direkte tile-compositing
  - Returner PDF som stream
- [ ] Valider at målestok er korrekt ved 100% print (±1%)

### 1.8 Responsivt Design
- [ ] Desktop: Sidebar venstre + kort fylder resten
- [ ] Tablet: Sidebar kan collapses, kort fylder mere
- [ ] Mobil: Bottom sheet med tabs (Lag / Format / Print)
- [ ] Touch-venlige kontroller (min 44px tap targets)
- [ ] Kort-kontroller repositioneret til mobil

### 1.9 MVP Polish
- [ ] Loading states for kort-tiles og PDF
- [ ] Error handling: Fejlede tile-requests, PDF-fejl, netværksfejl
- [ ] Keyboard shortcuts: +/- for zoom, Escape for luk sidebar
- [ ] Favicon og meta tags
- [ ] OG-tags for social sharing
- [ ] Analytics (Plausible - privacy-venligt, GDPR ok)

---

## Fase 2 - Udvidede Kort-funktioner

### 2.1 Flere Basiskort
- [ ] Kort-lag selector i sidebar (radio group med preview-thumbnails):
  - Topografisk kort (DTK/Topo25) ← default
  - Ortofoto (luftfoto fra Dataforsyningen)
  - Skærmkort (Dataforsyningens skærmkort - enklere design)
  - Historisk: Høje Målebordsblade (1842-1899)
  - Historisk: Lave Målebordsblade (1901-1971)
- [ ] Smooth transition ved lag-skift
- [ ] Korrekt attribution per lag

### 2.2 Overlay-lag
- [ ] Checkbox-liste for overlay (kan kombineres):
  - Højdekurver (DHM/Terræn fra Dataforsyningen WMS)
    - Interval: 1m, 2.5m, 5m, 10m, 25m (valgfrit)
  - Matrikelkort (ejendomsgrænser)
  - Stednavne (separat lag)
  - Skovkort
- [ ] Opacity-slider per overlay (0-100%)
- [ ] Overlay inkluderes i PDF-print

### 2.3 Koordinat-grid
- [ ] UTM grid overlay (zone 32N / EPSG:25832):
  - Konfigurerbart interval: 100m, 500m, 1km, 5km, 10km
  - Grid-labels langs kanten
  - Farve/tykkelse konfigurerbar
- [ ] Lat/Lon grid alternativ:
  - Interval: Auto baseret på zoom, eller manuelt
  - Gradtal langs kanten
- [ ] Grid inkluderes i PDF med korrekte labels

### 2.4 Geolokation
- [ ] "Find mig" knap med GPS-ikon
- [ ] Browser Geolocation API
- [ ] Vis position med pulserende cirkel
- [ ] Accuracy-ring
- [ ] Permission-handling med forklaring

### 2.5 Brugerdefineret Målestok & Format
- [ ] Input-felt for custom målestok (f.eks. "1:15000")
- [ ] Input for custom papir-dimensioner (bredde × højde mm)
- [ ] Validering: Min/max grænser
- [ ] DPI-valgmulighed: 72, 150, 200, 300, 600
  - Vis estimeret filstørrelse
  - Advar ved > 300 DPI + A2+ (stor fil)

### 2.6 Bogmærker
- [ ] Gem nuværende position/zoom/lag som bogmærke
- [ ] Liste over bogmærker i sidebar
- [ ] Navngiv bogmærker
- [ ] Gem i localStorage (ingen backend nødvendig)
- [ ] Import/eksport bogmærker som JSON

---

## Fase 3 - Import & Tegning

### 3.1 GPX/KML/GeoJSON Import
- [ ] Upload-zone: Drag & drop + filvalg-knap
- [ ] Parse GPX → GeoJSON (via `@tmcw/togeojson`)
- [ ] Parse KML → GeoJSON (via `@tmcw/togeojson`)
- [ ] Parse GeoJSON direkte
- [ ] Vis ruter som linje-lag på kortet
- [ ] Vis waypoints som markører med labels
- [ ] Auto-zoom til importeret datas bounding box
- [ ] Styling-panel:
  - Linje-farve (color picker)
  - Linje-tykkelse (1-8px)
  - Linje-stil (solid, stiplet, prikket)
  - Markør-ikon (valgfrit)
- [ ] Flere filer kan importeres samtidig
- [ ] Fjern individuelle lag
- [ ] Importerede lag inkluderes i PDF

### 3.2 Tegneværktøjer
- [ ] Toolbar med tegneværktøjer:
  - Linje/rute (klik-for-punkt, dobbeltklik afslut)
  - Markør/punkt med label
  - Cirkel (center + radius)
  - Rektangel
  - Polygon (friform)
- [ ] MapLibre Draw integration (`@mapbox/mapbox-gl-draw` fork)
- [ ] Redigér tegninger: Flyt punkter, slet, ændre stil
- [ ] Styling per tegning (farve, tykkelse, fill-opacity)

### 3.3 Mål-værktøj
- [ ] Afstandsmåling: Klik punkt-til-punkt, vis total distance
- [ ] Arealmåling: Tegn polygon, vis areal i m²/km²/ha
- [ ] Vis målinger som labels på kortet
- [ ] Inkluder i print (valgfrit)

### 3.4 Eksport af Tegninger
- [ ] Eksporter tegninger som GPX
- [ ] Eksporter som GeoJSON
- [ ] Eksporter som KML
- [ ] Kopier til clipboard som GeoJSON

---

## Fase 4 - Avanceret

### 4.1 Multi-page Print
- [ ] "Multi-page" toggle i print-indstillinger
- [ ] Brugeren definerer et stort område (tegn rektangel)
- [ ] Automatisk opdeling i sider baseret på papirformat + målestok
- [ ] Konfigurerbart overlap (0-20mm)
- [ ] Preview: Vis grid af sider på kortet med sidetal
- [ ] Generer samlet PDF med alle sider
- [ ] Indeks-side med oversigt og sidetal-grid
- [ ] Referencegrid-labels (A1, A2, B1, B2...) på kanter

### 4.2 Delbare Links
- [ ] Generer URL med state: center, zoom, lag, målestok, format
- [ ] URL-parametre synkroniseres med kort-state
- [ ] "Del"-knap der kopierer URL til clipboard
- [ ] QR-kode generering (via `qrcode` library)
- [ ] QR-kode inkluderes valgfrit i PDF-print

### 4.3 PWA & Offline
- [ ] Service Worker registrering
- [ ] Web App Manifest (navn, ikon, theme-color)
- [ ] Cache strategi:
  - App shell: Cache first
  - Kort-tiles: Stale-while-revalidate
  - "Download område" feature: Brugeren vælger område + zoomniveau, tiles pre-caches
- [ ] Offline banner/indikator
- [ ] Installér-prompt

### 4.4 Dark Mode
- [ ] System-præference detection (`prefers-color-scheme`)
- [ ] Manuel toggle (sol/måne ikon)
- [ ] Gem præference i localStorage
- [ ] Tailwind dark: variant for alle komponenter
- [ ] Kort-UI og sidebar mørkt tema
- [ ] Note: Kortet selv er altid lyst (det er printbart)

### 4.5 Kort-historik
- [ ] localStorage: Gem seneste 20 print-konfigurationer
- [ ] Liste i sidebar med: Thumbnail, dato, placering, indstillinger
- [ ] Klik for at genindlæse konfiguration
- [ ] Slet individuelle eller alle
- [ ] Eksport historik som JSON

---

## Fil-oversigt (Forventet slutresultat)

```
topoprint/
├── PRD.md
├── PLAN.md
├── CLAUDE.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── .env.local                 # NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN
├── .env.example
├── .gitignore
├── public/
│   ├── icons/                 # PWA icons
│   ├── north-arrow.svg
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Hovedside - kort + sidebar
│   │   ├── globals.css
│   │   └── api/
│   │       └── pdf/
│   │           └── route.ts   # Server-side PDF endpoint
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapContainer.tsx
│   │   │   ├── MapControls.tsx
│   │   │   ├── PrintFrame.tsx
│   │   │   ├── GridOverlay.tsx
│   │   │   ├── GeolocationButton.tsx
│   │   │   └── DrawTools.tsx
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ScaleSelector.tsx
│   │   │   ├── PaperFormatSelector.tsx
│   │   │   ├── LayerSelector.tsx
│   │   │   ├── OverlaySelector.tsx
│   │   │   ├── GridSettings.tsx
│   │   │   ├── ImportPanel.tsx
│   │   │   ├── BookmarksPanel.tsx
│   │   │   └── HistoryPanel.tsx
│   │   ├── print/
│   │   │   ├── PrintButton.tsx
│   │   │   ├── PrintPreview.tsx
│   │   │   └── PdfGenerator.tsx
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   └── SearchResults.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Select.tsx
│   │       ├── Slider.tsx
│   │       ├── Toggle.tsx
│   │       ├── RadioGroup.tsx
│   │       ├── BottomSheet.tsx
│   │       └── Tooltip.tsx
│   ├── lib/
│   │   ├── map/
│   │   │   ├── sources.ts     # Tile source configs
│   │   │   ├── layers.ts      # Layer definitions
│   │   │   ├── styles.ts      # Map styles
│   │   │   └── utils.ts       # Geo-beregninger
│   │   ├── pdf/
│   │   │   ├── generator.ts   # PDF-generering logik
│   │   │   ├── layout.ts      # PDF-layout (marginaler, nord-pil, etc.)
│   │   │   └── tiles.ts       # Tile-fetching og compositing
│   │   ├── api/
│   │   │   ├── dawa.ts        # DAWA adressesøgning
│   │   │   └── dataforsyningen.ts  # Dataforsyningen API wrapper
│   │   ├── geo/
│   │   │   ├── projections.ts # UTM ↔ WGS84 konvertering
│   │   │   ├── grid.ts        # Grid-beregning
│   │   │   └── parsers.ts     # GPX/KML/GeoJSON parsing
│   │   └── utils/
│   │       ├── debounce.ts
│   │       └── format.ts
│   ├── stores/
│   │   ├── mapStore.ts        # Kort-state (center, zoom, layers)
│   │   ├── printStore.ts      # Print-state (format, målestok, DPI)
│   │   ├── drawStore.ts       # Tegne-state
│   │   └── uiStore.ts         # UI-state (sidebar, dark mode)
│   ├── types/
│   │   ├── map.ts
│   │   ├── print.ts
│   │   └── geo.ts
│   └── constants/
│       ├── scales.ts          # Målestokforhold
│       ├── paperFormats.ts    # Papir-dimensioner
│       └── tileSources.ts     # WMTS endpoints
└── tests/
    ├── unit/
    │   ├── geo/
    │   ├── pdf/
    │   └── stores/
    └── e2e/
        ├── search.spec.ts
        ├── print.spec.ts
        └── layers.spec.ts
```

---

## Dataforsyningen API-opsætning

### Token
1. Opret bruger på https://dataforsyningen.dk
2. Opret token under "Mine tokens"
3. Gem som `NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN` i `.env.local`

### WMTS Endpoints
```
Topografisk kort:
https://api.dataforsyningen.dk/topo_skaermkort_wmts_DAF?service=WMTS&token={TOKEN}

Ortofoto:
https://api.dataforsyningen.dk/orto_foraar_wmts_DAF?service=WMTS&token={TOKEN}

Historisk (Høje Målebordsblade):
https://api.dataforsyningen.dk/hoeje_maalebordsblad_wmts?service=WMTS&token={TOKEN}
```

### DAWA (ingen token)
```
Autocomplete:
https://api.dataforsyningen.dk/adresser/autocomplete?q={query}

Stednavne:
https://api.dataforsyningen.dk/stednavne2/autocomplete?q={query}
```

---

*Plan oprettet: 2026-02-26*
