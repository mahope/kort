# kort.solaris.dk — Env-brandet, delt kodebase — Design

**Dato:** 2026-07-06
**Status:** Godkendt design → afventer implementeringsplan
**Repo:** `github.com/mahope/kort` (uændret; Solaris-Dokploy har fået læseadgang)

## Formål

Udgive `kort.solaris.dk` — en Solaris-brandet udgave af den eksisterende `kort.mahoje.dk` (gratis print af danske topografiske kort). De to sites skal dele **én kodebase**, så fejlrettelser og nye features rammer begge. Solaris får **fuld visuel identitet** (navn, logo, farver, om-side), men der bevares en tydelig **"Bygget af mahoje.dk"**-kredit overalt, da Mads/mahoje har lavet appen.

## Non-goals

- Ingen ændring af selve kortfunktionaliteten (kortvisning, print, PDF, import, tegning). Kortet forbliver visuelt neutralt — det skal være læsbart.
- Ingen nye datakilder. Dataforsyningen (vector tiles) + DAWA (adressesøgning) bruges uændret; frie offentlige geodata, ingen API-nøgler.
- Ikke en fork. Der oprettes **ikke** et separat `solarisdk/kort`-repo.
- Ingen deling af brugerdata mellem sites (der er ingen brugerdata — appen har intet login/backend).

## Nuværende tilstand (kilde)

- Next.js 16 (App Router, Turbopack, standalone-output), React 19, MapLibre GL JS 5, Tailwind CSS 4 (CSS-first), Zustand 5, jsPDF 4, Vitest 4.
- Branding er hardcodet spredt over ~15 steder (fundet via grep på `mahoje`/`mahope`):
  - `next.config.ts` — `images.remotePatterns` hostname `mahoje.dk`
  - `src/app/layout.tsx` — title/template, `metadataBase`, OpenGraph, `authors`, JSON-LD (`name`, `url`, forfatter)
  - `src/app/om/page.tsx` — hel personlig "Om"-side (Mads' portræt fra `mahoje.dk`, freelance-WordPress-bio, GitHub/email/links)
  - `src/app/sitemap.ts`, `src/app/robots.ts` — `https://kort.mahoje.dk`
  - `src/app/opengraph-image.tsx` — OG-billede med "Kort.mahoje.dk"
  - `src/app/topografisk-kort-print/page.tsx` — FAQ-tekst + GitHub/mahoje-links
  - `src/lib/import/exporter.ts` — GPX `creator="kort.mahoje.dk"`
  - `src/lib/analytics.ts` — Plausible `domain: "kort.mahoje.dk"` (endpoint `analytics.holstjensen.eu` — uændret)
  - `src/components/sidebar/Sidebar.tsx` — `<h1>Kort.mahoje.dk</h1>`
  - `src/lib/pdf/generator.ts` — PDF-attribution `"Kortdata: Klimadatastyrelsen | kort.mahoje.dk"`
  - `public/manifest.json`, `public/offline.html` — navn/titel
  - `package.json` — `name: "kort-mahoje"` (kosmetisk; røres ikke nødvendigvis)
- Tema er rene CSS-variabler i `src/app/globals.css` (`:root` lys, `.dark` mørk, `@theme inline` mapper til Tailwind-tokens). Nuværende accent: blå `#2563eb` / rød `#dc2626`.
- Dockerfile: multi-stage `node:20-alpine`, `npm run build` i builder-stage, kører `.next/standalone/server.js`.

## Arkitektur

### 1. Brand-register (`src/config/brand.ts`)

Ny typet konfiguration. Ét `Brand`-interface, to konkrete brands, valgt af env:

```
type BrandId = "mahoje" | "solaris";

interface Brand {
  id: BrandId;
  siteName: string;          // "Kort.solaris.dk"
  domain: string;            // "kort.solaris.dk"
  baseUrl: string;           // "https://kort.solaris.dk"
  tagline: string;           // kort SEO-tagline
  description: string;       // meta description
  ogTitle: string;
  logo: { wordmark: string; icon192: string; favicon: string };
  themeAttr: BrandId;        // -> <html data-brand>
  analyticsDomain: string;   // Plausible domain-felt
  attribution: {             // "Bygget af mahoje.dk"
    label: string;           // "Bygget af mahoje.dk"
    url: string;             // "https://mahoje.dk"
    short: string;           // brugt i PDF/GPX ("kort.solaris.dk")
  };
  github: string;            // repo-url (mahope/kort — fælles)
  contactEmail: string;      // Solaris' kontakt
  about: AboutContent;       // struktureret om-side-indhold pr. brand
}
```

- `getBrand()` læser `process.env.NEXT_PUBLIC_BRAND` (default `"mahoje"`) og returnerer det matchende `Brand`. Ukendt værdi → fald tilbage til `mahoje` (aldrig crash).
- Alle hardcodede strenge i touchpoints ovenfor erstattes med opslag i `getBrand()`.
- **Build-time:** `NEXT_PUBLIC_*` inlines af Next ved `npm run build`. Værdien er derfor et **build-ARG**, ikke kun runtime-env.

### 2. Tema (fuld Solaris-identitet)

- `layout.tsx` sætter `<html data-brand={getBrand().themeAttr}>`.
- `globals.css` udvides med `:root[data-brand="solaris"]` + `:root[data-brand="solaris"].dark` der overstyrer farve-variablerne:
  - Accent/interaktiv: Solaris-gul `#f4d425`.
  - Primær tekst/kant/knap-baggrund: sort `#000000` (gul alene har for lav kontrast som "primary"; knapper = sort flade med gul accent/hover).
  - Resten (surface, border, text-secondary) justeres til en varm, neutral Solaris-palette.
- mahoje-brandet får ingen `data-brand`-override og beholder nuværende blå/rød 1:1.

### 3. Logo, favicon & PWA

- Solaris-assets kopieres ind i repoet under `public/brand/solaris/`:
  - `icon-192.png` (fra Solaris `cropped-Solaris-stjerne-gul-192x192.png`) — PWA + favicon
  - `wordmark.png` (fra `Logo-Solaris.png` / `logo-solaris-sort-gul.png`) — sidebar
  - evt. `icon-512.png` (opskaleret/genereret) til PWA-krav
- `public/manifest.json` → dynamisk `src/app/manifest.ts` der læser `getBrand()` (navn, ikoner, theme_color).
- `opengraph-image.tsx` gøres brand-bevidst (titel + accentfarve).
- `layout.tsx` `icons`/favicon peger på brandets ikon.
- mahoje beholder sine nuværende ikoner (`public/icons/*` uændret; mahoje-brandet peger på dem).

### 4. "Om"-side & mahoje-kredit

- `src/app/om/page.tsx` renderer brand-betinget indhold fra `Brand.about`.
- **Solaris-variant** (foreningens stemme): kort "hvorfor" (spejderforening under DDS, behov for gratis print af ordentlige topografiske kort til ture/orientering/kortlære), fastholder gratis-/ingen-login-etos, og en fremhævet **"Bygget af mahoje.dk"**-blok der linker til https://mahoje.dk. Ingen personlig Mads-bio/portræt. **Ingen Solaris-kontakt-email** — kun mahoje-kreditten. GitHub-link peger på det fælles repo `https://github.com/mahope/kort`.
- **mahoje-variant:** nuværende personlige side, uændret.
- mahoje-kreditten går desuden igen i:
  - Sidebar-footer (link "Bygget af mahoje.dk" → mahoje.dk)
  - PDF-attribution (`generator.ts`): `"Kortdata: Klimadatastyrelsen | kort.solaris.dk"` + "Bygget af mahoje.dk"
  - GPX-eksport (`exporter.ts`): `creator="kort.solaris.dk"` (mahoje-kredit i om-siden dækker attributionskravet)

### 5. Deployment

- **Dockerfile:** tilføj `ARG NEXT_PUBLIC_BRAND=mahoje` + `ENV NEXT_PUBLIC_BRAND=$NEXT_PUBLIC_BRAND` i builder-stage før `npm run build`, så værdien inlines pr. build.
- **Solaris-Dokploy:** ny compose (eller app) i et Solaris-projekt der bygger `mahope/kort`, branch `main`, med build-ARG `NEXT_PUBLIC_BRAND=solaris`. autoDeploy=true på push til `main`.
  - Konsekvens: push til den delte main rebuilder **både** kort.mahoje.dk (Mads' egen Dokploy) og kort.solaris.dk. Det er tilsigtet ("én kodebase").
- **DNS:** `kort.solaris.dk` A/CNAME → Solaris-Dokploy (135.181.148.13) via Cloudflare (Solaris DNS-konto), proxied. Traefik-label + LetsEncrypt-cert på Dokploy-domænet.
- **CSP:** hvis appen sætter Content-Security-Policy, skal `analytics.holstjensen.eu`, Dataforsyningens tile-hosts og DAWA være tilladt (verificeres — Next-appen har muligvis ingen CSP).

## Datakilder

Uændret: Dataforsyningen (Klimadatastyrelsen) vector tiles (EPSG:3857) + DAWA (adresser/stednavne). Frie offentlige geodata, ingen nøgler, ingen kvote-binding pr. brand.

## Test

- **Unit (Vitest):** `brand.test.ts` — `getBrand()` returnerer korrekt sæt for `"solaris"` og `"mahoje"`, og falder tilbage til `mahoje` ved ukendt/tom værdi.
- **Byggeverifikation:** byg med `NEXT_PUBLIC_BRAND=solaris` og bekræft: title/OG = Solaris, `data-brand="solaris"` på `<html>`, gul accent aktiv, Solaris-logo i sidebar, om-siden = Solaris-tekst med mahoje-kredit, PDF-attribution = kort.solaris.dk. Byg med default og bekræft mahoje uændret.
- **Regressions-tjek:** ingen resterende hardcodet `kort.mahoje.dk` i Solaris-branded output (grep på build-output/renderet HTML).

## Rollout-rækkefølge

1. Introducér `brand.ts` + templatisér alle touchpoints (default `mahoje` → nul adfærdsændring).
2. Tilføj Solaris-tema, -assets, -om-indhold.
3. Dockerfile build-ARG.
4. Commit + push til `mahope/kort` main (kort.mahoje.dk rebuilder identisk — verificér uændret).
5. Opret Solaris-Dokploy compose (brand=solaris) + DNS `kort.solaris.dk`.
6. Verificér kort.solaris.dk live (tema, logo, om, print/PDF, adressesøgning, PWA-install).

## Risici

- **Build-time env:** glemmes ARG'en i Dockerfile, får Solaris-deployet mahoje-branding. Afbødet af byggeverifikation (tjek `data-brand`/title i output).
- **Delt autoDeploy:** en fejlbehæftet commit rammer begge sites samtidig. Afbødet af at kortlogikken ikke ændres her; kun branding-lag tilføjes bag default-`mahoje`.
- **Kontrast:** gul som accent kan give WCAG-problemer på hvid. Afbødet af sort-primær + gul-kun-accent, og kontrasttjek på knapper/links.
- **PWA-cache:** to brands må ikke dele service-worker-cache på tværs af domæner — de kører på hver sit domæne, så cachen er domæne-isoleret (intet problem).

## Afklarede beslutninger

- Solaris-om-siden har **ingen kontakt-email** — kun mahoje-kreditten.
- GitHub-links på Solaris-varianten peger på det fælles repo `https://github.com/mahope/kort` (org `mahope`; bemærk: brand-domænet er `mahoje.dk`, GitHub-org er `mahope`).

## Åbne punkter (afklares i plan)

- Præcis Solaris-farvemapping for surface/border/text i lys+mørk (konkrete hex).
- Om `package.json` `name` og repo-README skal nævne begge brands (kosmetisk).
