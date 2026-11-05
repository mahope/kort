# PoC: kortappen i Vite i stedet for Next.js (issue #40)

Gren `poc/40-vite` (fra `origin/main` e7aa242). Next-appen er urørt. Vite-versionen ligger i `poc-vite/` og genbruger `src/` uden kopiering. Må ikke merges.

## Resultat i korte træk

- PoC'en virker: kortet, søgning (adresse), MGRS-gitter og PDF-eksport opfører sig ens i begge builds. Forsidens skærmbilleder er pixelidentiske (1440, 390 og MGRS, sha1 ens). **Nul ændringer i `src/`.**
- First-load JS: 638 KB gz (Next) mod 544 KB gz (Vite), -94 KB (-15 %). 16 mod 4 JS-requests.
- Mobil TBT 1.605 mod 553 ms, TTI 7,2 mod 5,1 s, performance 34 mod 86 (Lighthouse, simuleret throttling). Build 9,0 s mod 0,6 s.
- **Men:** Vites forside er tom, til JS er hentet. Med rigtig (devtools) throttling er FCP/LCP *dårligere* i Vite (4,6 s mod 1,8 s). Det store LCP/CLS-spring i den simulerede måling skyldes primært et layout shift i Next-forsiden (CLS 0,389), ikke bundleren.
- Det meste af byte-gevinsten (jsPDF, ca. 100-117 KB gz, ligger i first-load, fordi `generator.ts` importerer den statisk) kan tages i Next med lazy-load. Bundleren er ikke den største løftestang.
- **Anbefaling: A nu, og behold PoC'en som plan B.** Se nederst.

## Afvigelser fra jobbeskrivelsen (læs først)

1. **Vite er 8.1.3 i træet, ikke 8.3.5** (`package-lock.json`: `node_modules/vite` 8.1.3, via vitest). Jeg har brugt den installerede 8.1.3 og ingen nye pakker i træet. 8.3.5 findes (udgivet 21/10, 15 dage gammel) og kan testes ved en bump; ikke gjort, så tallene gælder 8.1.3 + `@vitejs/plugin-react` 6.0.3 (allerede i træet).
2. **`~/dev/data/audit-2026-11-05/` findes ikke på denne maskine** (hverken tools eller `run-lh-kort.sh`), og `~/dev/pw-chrome.sh` findes ikke. Sammenligningstal fra den tidligere audit kunne derfor ikke bruges direkte. Min Next-måling (637.617 B gz first-load) stemmer dog med issuets 637 KB.
3. Jeg installerede selv, isoleret i `~/dev/poc-tools-40` (uden for repoet, `--ignore-scripts`, `--save-exact --before=2026-10-30`): **lighthouse 13.6.0** (udgivet 27/10, 9 dage; maintainers paulirish/hoten/lusayaa, Chrome-teamet) og **playwright-core 1.64.1** (14/10, 22 dage; Microsoft). Begge uden install-scripts af betydning; konklusion: installér med `--ignore-scripts`. Lighthouse trækker ca. 100 pakker med. Ikke tilføjet til repoets `package.json`.
4. Chrome: Playwright og Lighthouse bruger `/usr/bin/google-chrome` (Stable 151.0.7922.108) via `executablePath`/`CHROME_PATH`, fordi `pw-chrome.sh` mangler. **Sandbox er slået til**: jeg har *ikke* brugt `--no-sandbox`, selvom jobbeskrivelsens Lighthouse-flags nævner det (den faste regel siger det modsatte, og det virkede uden). Kun `127.0.0.1` er åbnet i browseren; kortets egne tile-/API-kald til Dataforsyningen/KDS er appens normale trafik.

## Hvad der er lavet

| Fil | Formål |
|---|---|
| `poc-vite/index.html` | Erstatter `layout.tsx` (tema-script, meta, favicon). Mangler stadig JSON-LD, OG, canonical (se paritet) |
| `poc-vite/main.tsx` | Kopi af `src/app/page.tsx` (45 linjer) + `enableAnalytics()` |
| `poc-vite/fonts.css` | `@font-face` i stedet for `next/font/local` |
| `poc-vite/vite.config.ts` | alias `@`, `define` for `NEXT_PUBLIC_*`, `publicDir=../public`, postcss fra repoets `postcss.config.mjs` (Tailwind 4) |
| `package.json` | scripts `build:vite`, `preview:vite` (ingen nye afhængigheder) |
| `poc-vite/measure/*.mjs` | `bundle`, `lh`, `lh-one`, `smoke` og hjælpere (genkørbare) |
| `.gitignore` | `/poc-vite/dist/` |

**Shims (hver):**
1. `next/dynamic` med `ssr:false` → `React.lazy` + `Suspense` (i `poc-vite/main.tsx`). Eneste Next-import på kortsiden.
2. `next/font/local` → `poc-vite/fonts.css` (brygada/schibsted som variabel-fonte, samme woff2).
3. `process.env.NEXT_PUBLIC_*` → `define` i Vite-konfigurationen (Next inliner dem selv).
4. `layout.tsx` (html-attributter, tema-script, meta) → `index.html`; `<Analytics/>` → direkte kald.
5. Ingen alias til `next/link`/`next/image` behøvet: de bruges kun af `/om` og `/topografisk-kort-print`, som ikke er med.

## Målinger

Samme maskine, serielt, kun `127.0.0.1`. Load (1 min) ved start af buildmåling: 2,59 (Next) og 2,95 (Vite). Under Lighthouse-kørslerne 0,7-3,9 pr. kørsel (står i `data/lighthouse.json`). Rækkefølgen skiftede mellem runderne.

### 1. Bundle (Playwright-netværkslog, rå og `gzip -9`, sourcemap-comment strippet)

| | Next | Vite | Δ |
|---|---|---|---|
| First-load JS gz | 637.617 B (638 KB) | 543.699 B (544 KB) | -93.918 B (-15 %) |
| First-load JS rå | 2.258.504 B | 1.947.862 B | -310 KB |
| JS-requests ved load | 16 | 4 | -12 |
| Al emitteret JS gz (inkl. lazy) | 794.406 B (24 filer) | 650.445 B (8 filer) | -144 KB |

Opdeling af first-load, KB gz (andel pr. chunk fra sourcemap, så tallene er tilnærmede; Next og Vite er målt på builds med sourcemaps, ellers identiske):

| Post | Next | Vite |
|---|---|---|
| maplibre-gl | 272,7 | 273,8 |
| jsPDF + deps (core-js, fast-png, ...) | 117,3 | 100,5 |
| terra-draw | 37,9 | 38,0 |
| React/ReactDOM | 67,9 | 54,1 |
| Framework-runtime (Next-klient/turbopack mod rolldown-runtime + ukortlagt) | 74,6 | 19,6 |
| Appens egen kode | 39,2 | 33,0 |
| Øvrige libs (zustand, react-map-gl, mgrs, togeojson) | 26,4 | 24,7 |
| Ukortlagt | 1,8 | (i runtime) |

Læs: Vites gevinst er næsten kun framework-runtime (-55 KB) og React (-14 KB: Next ships sin egen kompilerede react-dom) samt jsPDF-deps (-17 KB). maplibre er upåvirket og dominerer. **jsPDF er i first-load i begge builds**, fordi `src/lib/pdf/generator.ts` importerer `jspdf` statisk og `PrintButton` importerer generatoren. Lazy-load er altså ortogonalt til bundler.

Sidste outputlinje: `vite first-load { raw: 1947862, gz: 543699, n: 4 } all { files: 8, raw: 2329452, gz: 650445 }` (og `next first-load { raw: 2258504, gz: 637617, n: 16 } all { files: 24, raw: 2789082, gz: 794406 }`).

### 2. Build-tid (kold, `rm -rf` output før hver, 3 kørsler)

| | Run 1 | Run 2 | Run 3 | Median |
|---|---|---|---|---|
| `npm run build` (Next 16.4.1, Turbopack) | 8,49 s | 9,27 s | 9,04 s | **9,04 s** |
| `npm run build:vite` (Vite 8.1.3) | 0,60 s | 0,56 s | 0,58 s | **0,58 s** |

Sidste outputlinjer: `next build run3 9.04 s` / `vite build run3 0.58 s` (tid inkl. npm-opstart). Vites egen "built in" var 476 ms. Begge er hurtige her; det er ikke et argument i sig selv.

### 3. Lighthouse 13.6.0 (median af 3, performance + accessibility, simuleret standard-throttling)

| | Next mobil | Vite mobil | Next desktop | Vite desktop |
|---|---|---|---|---|
| Performance | 34 | 86 | 93 | 95 |
| Accessibility | 94 | 94 | 94 | 94 |
| TBT | 1.605 ms | 553 ms | 198 ms | 179 ms |
| LCP | 5.668 ms | 907 ms | 258 ms | 248 ms |
| CLS | 0,389 | 0 | 0 | 0 |
| TTI | 7.212 ms | 5.094 ms | 1.468 ms | 1.190 ms |
| FCP | 917 ms | 907 ms | 258 ms | 248 ms |

Enkeltkørsler spreder meget (mobil Vite perf 79-89, TBT 391-899 ms; maskinen var belastet af andre jobs, load op til 3,9), så brug retningen, ikke decimalerne. Next mobil perf var 32-37.

**Forbehold, som ændrer konklusionen om LCP/CLS** (`data/lh-diagnose*.json`, 1 kørsel pr. build):
- LCP-elementet er `<h1>` i sidebaren i begge builds. I Next flytter `main.relative` sig, når kortet dynamisk monteres efter hydrering (CLS 0,389), og det trækker den simulerede LCP til ca. 5,5 s. Det er en layout-fejl i Next-forsiden (kan rettes ved at reservere plads) og ikke en bundler-egenskab. I Vite er der intet SSR-HTML at flytte.
- Med `--throttling-method=devtools` (rigtig netværksdrosling) er Vite **dårligere** på første paint: FCP=LCP 4.574 ms mod 1.797 ms (Next), fordi `index.html` er tom, til 495 KB gz JS er hentet. TTI er stadig bedre i Vite (5.802 mod 7.311 ms). En statisk app-skal i `index.html` (sidebar-skelet) eller prerender af indholdet ville ophæve det.
- Dermed: **TBT og TTI er de pålidelige gevinster** (mindre runtime, ingen hydrering). FCP/LCP-forbedringen i tabellen er delvist et artefakt.

Sidste outputlinje: `{"key":"vite-desktop","value":{"n":3,"perf":95,"a11y":94,"tbt":179,"lcp":248,"fcp":248,"cls":0,"tti":1190}}`.

### 4. Funktions-smoke (Playwright, begge builds)

| Tjek | Next | Vite |
|---|---|---|
| Kort indlæses (canvas, 0 konsol-/sidefejl) | ja | ja |
| Søgning, adresse ("Rådhuspladsen 1") | 6 forslag | 6 forslag |
| Søgning, stednavn ("Himmelbjerget") | 3 forslag | **0 forslag** (`/api/stednavne` findes ikke i Vite) |
| MGRS `?cs=mgrs&g=1`: parametre bevaret, 2 afkrydsninger | ja | ja |
| PDF A4, 150 dpi, København (`c=55.6761,12.5683,12`) | 944.933 B, `%PDF-` | 944.933 B, `%PDF-` |

Bemærkning: PDF'en med standardcentret (Kattegat, åbent hav) er kun 28.720 B, altså under de 50 KB. Det er indholdsfattigt kort, ikke en fejl. Jeg har derfor eksporteret i København. Samme størrelse i begge builds.

Sidste outputlinje: `vite {"errors":[],"mapCanvas":0,"mapLoaded":true,... "pdf":{"name":"kort_125k_A4_202611051250.pdf","bytes":944933,"ms":1598,"header":"%PDF-"}}`. Tests i øvrigt: `npx tsc --noEmit` exit 0; `npx vitest run`: `Tests  142 passed (142)` (15 filer), uændret.

Skærmbilleder: `docs/poc-vite/{next,vite}-1440.png`, `-390.png`, `-mgrs-1440.png`. Hver Next/Vite-par er byte-identiske (`cmp`), så en side-om-side-fil ville vise to ens billeder. Kortfliserne var færdigindlæst ved optagelsen.

## Paritetsliste (hvad mangler, før Vite kan erstatte Next)

| Område | Status i PoC | Vurdering |
|---|---|---|
| Kortside `/` (kort, sidebar, MGRS, URL-state) | Virker, pixelident | Gjort |
| Print/PDF (jsPDF) | Virker. Er i first-load i begge builds | Trivielt: `import()` i `PrintButton` (-100 KB gz) |
| Routing `/om`, `/topografisk-kort-print` | Ikke med. Bruger `next/link`/`next/image`, metadata-API. 300 linjer SEO-tekst | Dage: enten Astro (statisk, bedst SEO) eller behold dem i Next. Vite-SPA bør ikke bære dem |
| `/api/stednavne` | Mangler (se smoke: 0 forslag) | ~1 dag: Hono/Fastify på Node (genbruger `src/lib/stednavne/*` + `data/stednavne.tsv.gz` + rate limiter, kun route-laget er Next) eller Cloudflare Worker (kræver anden loader til TSV-snapshot). Uafklaret valg |
| Headers/CSP (`next.config.ts`) | Mangler | Trivielt-dage: flyttes til reverse proxy/server. `preview` sætter ingen. CSP skal re-testes (`unsafe-inline` til tema-script) |
| `manifest.webmanifest` | Mangler (genereres af `manifest.ts`) | Trivielt: statisk fil pr. brand (build-tid) |
| `sitemap.xml`, `robots.txt` | Mangler | Trivielt: statiske filer; følger af Astro hvis valgt |
| `opengraph-image` | Mangler (genereres af `next/og`/satori, 260 linjer) | Dage/uafklaret: forgenerér en PNG, eller `satori` som build-script |
| `icon.svg`, favicon | Favicon peger på `public/brand/favicon.svg`; `src/app/icon.svg` ikke kopieret | Trivielt |
| `sw.js`/offline | Fungerer uændret: `sw.js` cacher `.js/.css/.woff2` generelt, ikke kun `/_next/static/`. `APP_SHELL` er `/` og `/offline.html` | Trivielt; verificér update-flowet efter deploy |
| Miljøvariabler | `NEXT_PUBLIC_*` mappet via `define` (BRAND, 2 tokens) | Trivielt: omdøb til `VITE_*` ved rigtig migrering (`NEXT_PUBLIC_` virker kun via min `define`) |
| Docker/Dokploy | Ikke berørt (må ikke) | Dage: to mål (statisk SPA + API/indholdssider) eller ét Node-image med statisk serve + API. Nyt deploy-trin og Traefik-routing. Uafklaret |
| SEO for indholdssiderne | Forsiden har ikke JSON-LD, OG, canonical, `lang`-metadata i `index.html` (kun title/description) | Dage: tab af SSG hvis sider bliver SPA; forsiden selv har lidt indhold. Løses med Astro |
| Analytics (Plausible) | Virker via eksisterende `enableAnalytics()`; ikke verificeret mod endpoint (kun localhost) | Trivielt |
| Tests (vitest) | Uændret og grøn (142). `vitest.config.ts` har allerede react-plugin og alias | Trivielt |
| `eslint-config-next` | Ikke rørt; reglerne for `next/*` er irrelevante for Vite-delen | Trivielt: skift til `typescript-eslint` + `react-hooks`; Next-delen beholder sin config |
| `tsconfig` | `tsc --noEmit` grøn med `poc-vite/` med | Trivielt (fjern next-plugin ved ren Vite) |
| Server-side FCP | Mangler (blank til JS er hentet) | Dage: app-skal i `index.html`, ellers dårligere førstepaint (se måling 3) |

## Nemt og svært

**Nemt:** selve kortappen er allerede ren klientside. Hele porteringen var én entry-fil, en CSS-fil, en `index.html` og en 35-linjers config. `src/`, Tailwind 4, MapLibre, Zustand, jsPDF og vitest virkede uden ændringer. Byggetid er irrelevant (begge under 10 s).

**Svært/uafklaret:** alt *omkring* kortet. Indholdssiderne (SEO), stednavne-API'et med snapshot og rate limit, OG-billedet, CSP/headers og to deploy-mål. Og førstepaint: uden SSR bliver forsiden tom, til JS er hentet.

## Anbefaling: A (bliv på Next, tag de billige gevinster), PoC'en gemmes som plan B

Begrundelse:
- Vites reelle gevinst er -15 % first-load JS og ca. -65 % mobil TBT. Det er ikke ubetydeligt, men *halvdelen af byte-gevinsten findes i app-koden*: jsPDF i first-load (-100 KB gz) og layout-shiftet (CLS 0,389) kan rettes i Next uden migrering. Gentag måling efter A, før beslutning om B.
- Vite giver ingen gevinst på maplibre (273 KB gz), som er den største post i begge.
- B forringer førstepaint uden app-skal og kræver nyt API-lag, nyt routing og to deploys. Det er den risiko, issuet beskriver, og PoC'en afkræfter den ikke.
- Hvis tallene efter A stadig er for dårlige på mobil: B med Astro til indholdssiderne og Vite til kortet, og så *med* statisk app-skal.

**Estimat for rigtig migrering (B):** ca. 4-5 arbejdsdage. Routing/Astro for to indholdssider 1-1,5 d, stednavne-API som Hono 1 d, headers/CSP/manifest/sitemap/robots/OG 0,5-1 d, Docker/Dokploy/Traefik 1 d, app-skal + SEO-regressionstjek + QA af SW/offline 0,5-1 d. Estimatet er mit skøn, ikke målt.

## Genkør

```
npm run build && npm run build:vite
node poc-vite/measure/bundle.mjs docs/poc-vite/data/bundle.json   # kræver sourcemap-builds (se lib.mjs)
node poc-vite/measure/lh.mjs docs/poc-vite/data/lighthouse.json
node poc-vite/measure/smoke.mjs docs/poc-vite/data/smoke.json
```

`bundle.mjs` forventer sourcemap-builds uden for repoet: `~/dev/poc-tools-40/nextcopy` (kopi af repoet med `productionBrowserSourceMaps: true`, bygget dér; `next.config.ts` i repoet er urørt) og `~/dev/poc-tools-40/vite-map` (`vite build --sourcemap --outDir …`).
