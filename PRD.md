# PRD: TopoPrint.dk - Gratis Topografisk Kortudskrivning

## 1. Produktoversigt

### Vision
TopoPrint.dk er en gratis, moderne webapplikation til udskrivning af topografiske kort over Danmark. Tjenesten bygger videre på konceptet fra [k.pegel.dk](http://k.pegel.dk/) men med markant bedre UI/UX, flere funktioner og moderne teknologi.

### Problemformulering
Eksisterende løsninger (k.pegel.dk, beta.topokort.dk, spejderliv.dk) lider af:
- **Forældet UI** - Ældre webteknologi, dårlig responsivitet
- **Begrænsede målestokforhold** - Typisk kun 4 cm (1:25.000) og 2 cm (1:50.000)
- **Manglende koordinatsystemer** - Brugere klager over mangel på UTM/GPS-grid
- **Ringe mobiloplevelse** - Fungerer dårligt på telefoner og tablets
- **Begrænset papirformat** - Ikke alle størrelser tilgængelige
- **Ingen GPX/KML-integration** - Kan ikke overlejre egne ruter

### Målgruppe
- Spejdere og orienteringsløbere
- Kajak- og vandringsfolk
- Jægere og fiskere
- Lærere og elever (geografi)
- Hobbynavigationsinteresserede
- Militær- og beredskabsfolk (øvelseskort)

---

## 2. Konkurrentanalyse

| Feature | k.pegel.dk | beta.topokort.dk | spejderliv.dk | **TopoPrint.dk** |
|---|---|---|---|---|
| Pris | Gratis | Gratis | Gratis | **Gratis** |
| Målestok | 1:25k, 1:50k | Frit valg | 1:10k-1:500k | **1:10k-1:500k + brugerdefineret** |
| Papirformat | A3, A4 | Ukendt | A0-A5 | **A0-A5 + brugerdefineret** |
| DPI-indstillinger | Nej | Nej | 72-300 | **72-600** |
| UTM-grid | Nej (kritiseret) | Ja | Ja | **Ja, konfigurerbart** |
| GPX/KML-import | Nej | Nej | Nej | **Ja** |
| Mobilvenlig | Nej | Delvist | Delvist | **Fuldt responsiv** |
| Offline-brug | Nej | Nej | Nej | **PWA-support** |
| Kortlag-valg | Begrænset | Flere lag | Begrænset | **Fuldt konfigurerbart** |
| Stående/Liggende | Ja | Ukendt | Ukendt | **Ja + rotation** |
| Live preview | Begrænset | Ja | Ja | **Ja, realtime** |

---

## 3. Funktionelle Krav

### 3.1 Kernefunktioner (MVP)

#### Kortvisning & Navigation
- Interaktivt kort baseret på Leaflet eller MapLibre GL JS
- Smooth zoom og pan med mouse, touch og scroll
- Geolokation ("Find mig"-knap)
- Søgefelt med adresse/stednavne (via Dataforsyningens adresse-API)
- Bogmærker for gemte lokationer (localStorage)

#### Målestokforhold
- **Forudindstillede:** 1:10.000, 1:25.000 (4 cm), 1:50.000 (2 cm), 1:100.000, 1:250.000, 1:500.000
- **Brugerdefineret:** Frit input af ønsket målestok
- Visuelt målestok-lineal på kortet og i print

#### Papirformat & Layout
- **Standardformater:** A5, A4, A3, A2, A1, A0
- **Brugerdefineret:** Indtast bredde x højde i mm
- Stående / Liggende orientering
- Konfigurerbar margin (0-20 mm)
- Realtime preview-rektangel på kortet der viser printområdet

#### Kortlag (Layers)
Basiskort (vælg et ad gangen):
- Topografisk kort (DTK/Topo25 fra Dataforsyningen)
- Ortofoto (luftfoto)
- Skærmkort (Dataforsyningens skærmkort)
- Historiske kort (Høje Målebordsblade, Lave Målebordsblade)

Overlay-lag (kan kombineres):
- Højdekurver (5m, 10m, 25m interval)
- Matrikelkort (ejendomsgrænser)
- UTM-grid (zone 32N, konfigurerbart interval)
- Lat/Lon-grid
- Stednavne
- Skovkort

#### PDF-generering
- Server-side PDF-generering med korrekt DPI
- DPI-valgmuligheder: 72, 150, 200, 300, 600
- Korrekt målestok ved 100% print
- Automatisk tilføjelse af: målestok-lineal, nordpil, koordinatangivelse af hjørner, dato, kilde-attribution

### 3.2 Udvidede Funktioner (Post-MVP)

#### GPX/KML/GeoJSON Import
- Upload af rutefiler via drag & drop eller filvalg
- Visning af ruter, waypoints og tracks på kortet
- Styling: farve, tykkelse, stiplede linjer
- Automatisk zoom til importeret data
- Inkluderes i PDF-print

#### Tegneværktøjer
- Tegn rute/sti direkte på kortet
- Tilføj markører/punkter med labels
- Tegn cirkler, rektangler, polygoner (f.eks. søgeområder)
- Mål afstand og areal
- Eksporter tegninger som GPX/GeoJSON

#### Multi-page Print
- Automatisk opdeling af stort område i flere sider
- Overlap mellem sider (konfigurerbart)
- Indeks-side med oversigt
- Sidetal og referencegrid

#### Delbarhed
- Generer delbart link med kort-position, zoom, lag-valg
- QR-kode på printede kort der linker tilbage til digital version

#### Brugerprofiler (valgfrit)
- Gem favorit-indstillinger
- Gem og del kort-konfigurationer
- Historik over genererede kort

---

## 4. Ikke-funktionelle Krav

### Performance
- Tid til interaktivt: < 2 sekunder
- PDF-generering: < 10 sekunder for A4/300dpi
- Smooth 60fps kort-interaktion

### Tilgængelighed
- WCAG 2.1 AA compliance
- Keyboard-navigation i alle kontroller
- Skærmlæser-venlige kontroller

### Browser-support
- Chrome, Firefox, Safari, Edge (seneste 2 versioner)
- Fuldt responsivt design (mobil, tablet, desktop)
- PWA med offline-kortdata caching (ServiceWorker)

### Skalerbarhed
- PDF-generering via serverless functions (undgå server-overhead)
- Kortdata caches via CDN
- Mål: Håndtere 1.000+ samtidige brugere

---

## 5. Teknisk Arkitektur (Forslag)

### Frontend
- **Framework:** Next.js (App Router) eller SvelteKit
- **Kort-library:** MapLibre GL JS (open-source, WebGL-baseret)
- **Styling:** Tailwind CSS
- **State management:** Zustand eller built-in (SvelteKit stores)
- **PDF preview:** Canvas-baseret realtime preview

### Backend
- **PDF-generering:** Serverless function (Vercel/Cloudflare Workers)
- **PDF-library:** `pdf-lib` eller Puppeteer (headless Chrome rendering)
- **Kort-tiles:** Direkte fra Dataforsyningens WMTS/WMS API
- **Adressesøgning:** Dataforsyningens DAWA API (gratis, ingen nøgle)

### Datakilder (alle gratis)
- **Dataforsyningen (Klimadatastyrelsen):** Topografiske kort, ortofoto, højdemodel, matrikel
  - WMTS endpoint for kort-tiles
  - WMS endpoint for overlay-lag
  - Kræver gratis API-token fra dataforsyningen.dk
- **DAWA API:** Adresse- og stednavnesøgning (ingen token nødvendig)

### Hosting
- **Frontend:** Vercel / Cloudflare Pages (gratis tier)
- **Serverless PDF:** Vercel Functions / Cloudflare Workers
- **Domæne:** topokort.dk / topoprint.dk / kortprint.dk

---

## 6. UI/UX Design-principper

### Designfilosofi
- **Kortet fylder 90%+ af skærmen** - minimalt chrome
- **Progressive disclosure** - enkle defaults, avancerede indstillinger bag et toggle
- **One-click print** - fra landing til PDF med mindst mulige klik
- **Dark/light mode** - respekter OS-præference

### Layout (Desktop)
```
┌─────────────────────────────────────────────────────┐
│ [Logo] TopoPrint.dk    [Søgefelt...]    [☀/🌙] [?] │
├─────┬───────────────────────────────────────────────┤
│     │                                               │
│  S  │                                               │
│  I  │            INTERAKTIVT KORT                   │
│  D  │         (MapLibre GL JS)                      │
│  E  │                                               │
│  B  │     ┌─────────────────┐                       │
│  A  │     │  Print-område   │                       │
│  R  │     │  (grøn ramme)   │                       │
│     │     └─────────────────┘                       │
│  ─  │                                               │
│     │                                               │
│ Lag │                    [+][-][📍][🖨️]             │
│ Mål │                                               │
│ PDF │                                               │
│     │                                               │
├─────┴───────────────────────────────────────────────┤
│ Målestok: 1:25.000  │  Papir: A4  │  © Dataforsy..  │
└─────────────────────────────────────────────────────┘
```

### Layout (Mobil)
```
┌─────────────────────┐
│ [≡] TopoPrint [🔍]  │
├─────────────────────┤
│                     │
│    INTERAKTIVT      │
│       KORT          │
│                     │
│   [+][-][📍]       │
│                     │
├─────────────────────┤
│ [Lag] [Format] [🖨️] │
└─────────────────────┘
```

### Brugerflow (Happy Path)
1. Bruger lander på siden → Kort centreret på Danmark
2. Søger adresse eller navigerer til område
3. Vælger målestok (default: 1:25.000)
4. Vælger papirformat (default: A4 stående)
5. Justerer print-rammen ved at trække den
6. Klikker "Download PDF"
7. PDF genereres og downloades (< 10 sek)

---

## 7. Differentiering fra k.pegel.dk

| Vores fordel | Beskrivelse |
|---|---|
| **Moderne UI** | Glat, responsiv UI med MapLibre GL JS vs. gammel webteknologi |
| **Flere målestokforhold** | 6+ forudindstillede + brugerdefineret vs. kun 2 |
| **Konfigurerbart grid** | UTM og lat/lon med valgfrit interval |
| **GPX/KML import** | Overlay egne ruter og waypoints |
| **Tegneværktøjer** | Tegn direkte på kortet |
| **Mobilvenlig** | Fuldt responsivt design |
| **Flere kortlag** | Ortofoto, historiske kort, matrikel, højdekurver |
| **Højere DPI** | Op til 600 DPI for skarp print |
| **Multi-page print** | Automatisk sideopdeling for store områder |
| **Delbare links** | Del konfiguration via URL |
| **Dark mode** | Moderne UI-standard |
| **PWA / Offline** | Brug kortet offline med cached tiles |

---

## 8. Milepæle & Prioritering

### Fase 1 - MVP (4-6 uger)
- [ ] Interaktivt kort med Dataforsyningens topokort
- [ ] Søgefelt med adresseopslag (DAWA)
- [ ] Målestokvalg (6 forudindstillede)
- [ ] Papirformat (A5-A2, stående/liggende)
- [ ] Print-ramme preview på kortet
- [ ] PDF-generering med korrekt målestok
- [ ] Nordpil, målestok-lineal, attribution i PDF
- [ ] Responsivt design (mobil + desktop)

### Fase 2 - Udvidede Kort-funktioner (2-3 uger)
- [ ] Flere basiskort (ortofoto, skærmkort, historiske)
- [ ] Overlay-lag (højdekurver, matrikel, grid)
- [ ] UTM/Lat-Lon grid med konfigurerbart interval
- [ ] Geolokation
- [ ] Brugerdefineret målestok og papirformat
- [ ] DPI-indstillinger

### Fase 3 - Import & Tegning (2-3 uger)
- [ ] GPX/KML/GeoJSON import
- [ ] Rutevisning med styling
- [ ] Tegneværktøjer (linjer, punkter, polygoner)
- [ ] Afstandsmåling
- [ ] Eksport af tegninger

### Fase 4 - Avanceret (2-3 uger)
- [ ] Multi-page print
- [ ] Delbare links med QR-kode
- [ ] PWA med offline-support
- [ ] Dark mode
- [ ] Bogmærker og gemt historik

---

## 9. Risici & Mitigering

| Risiko | Sandsynlighed | Impact | Mitigering |
|---|---|---|---|
| Dataforsyningen ændrer API/vilkår | Lav | Høj | Abstraher datakilde-lag, overvåg ændringer |
| PDF-målestok upræcis | Middel | Høj | Grundig test med fysisk måling, kalibreringsside |
| Høj serverbelastning ved PDF-gen | Middel | Middel | Serverless + rate limiting + queue |
| Browser-kompatibilitet (WebGL) | Lav | Middel | Fallback til raster tiles |
| CORS-problemer med WMS/WMTS | Middel | Middel | Proxy via egen backend |

---

## 10. Succeskriterier

- **Brugbarhed:** En ny bruger kan generere et korrekt PDF-kort inden for 30 sekunder
- **Præcision:** Målestok er korrekt ±1% ved 100% print
- **Performance:** PDF genereres på < 10 sekunder (A4/300dpi)
- **Adoption:** 500+ unikke brugere/måned inden for 3 måneder efter lancering
- **Tilfredshed:** Positiv feedback fra spejder/frilufts-communities

---

## 11. Juridisk & Attribution

- Alle kortdata fra Dataforsyningen er frie offentlige data under dansk lovgivning
- Attribution til Klimadatastyrelsen/Dataforsyningen er **påkrævet** og skal vises i UI og på genererede PDF'er
- Ingen persondata indsamles (GDPR-venligt by design)
- Open source under MIT-licens (anbefales for community-bidrag)

---

*Dokument oprettet: 2026-02-26*
*Baseret på analyse af: k.pegel.dk, beta.topokort.dk, spejderliv.dk/findvej/kort, smartfidus.dk, kajakgal.dk*
