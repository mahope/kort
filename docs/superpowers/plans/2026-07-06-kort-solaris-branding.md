# kort.solaris.dk Env-Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the existing `kort.mahoje.dk` codebase a second, fully Solaris-branded skin (`kort.solaris.dk`) selected at build time by a single env var, sharing one codebase, while keeping a clear "Bygget af mahoje.dk" credit.

**Architecture:** A typed brand registry (`src/config/brand.ts`) resolves `NEXT_PUBLIC_BRAND` (default `mahoje`) into a `Brand` object. Every hardcoded `mahoje` string/asset/colour becomes a lookup. Theme is switched via a `data-brand` attribute on `<html>` plus `:root[data-brand="solaris"]` CSS-variable overrides. Two Dokploy deploys build the same repo with different build args.

**Tech Stack:** Next.js 16 (App Router, standalone output), React 19, Tailwind CSS 4 (CSS-first), Vitest 4, MapLibre GL JS 5, jsPDF 4. Docker multi-stage (`node:20-alpine`). Deploy: Solaris-Dokploy + Cloudflare DNS.

## Global Constraints

- **Default brand is `mahoje`** — any unknown/empty `NEXT_PUBLIC_BRAND` must resolve to `mahoje`. `mahoje`-branded output must stay byte-for-byte equivalent to today (zero behaviour change).
- **`NEXT_PUBLIC_BRAND` is build-time** — Next inlines `NEXT_PUBLIC_*` at `next build`. It must be a Docker build ARG, not only a runtime env.
- **GitHub org is `mahope`, brand domain is `mahoje.dk`** — repo links use `https://github.com/mahope/kort`; brand/site text uses `mahoje.dk`. Do not conflate.
- **No Solaris contact email** on the Solaris About page — only the mahoje credit + link to `https://github.com/mahope/kort`.
- **Map stays neutral** — do not restyle MapLibre map colours. Only app chrome (sidebar, buttons, about, meta) is branded.
- **Danish UI copy** with correct æ/ø/å, UTF-8. Code/comments in English.
- **No new data sources / API keys** — Dataforsyningen + DAWA unchanged.
- **Attribution string `short`** used in PDF/GPX is the brand domain (`kort.mahoje.dk` / `kort.solaris.dk`).

---

## File Structure

**Create:**
- `src/config/brand.ts` — brand registry + `getBrand()` / `resolveBrandId()`
- `src/config/brand.test.ts` — unit tests for resolution
- `src/components/about/AboutMahoje.tsx` — current About content, verbatim
- `src/components/about/AboutSolaris.tsx` — new Solaris About content
- `src/app/manifest.ts` — dynamic PWA manifest from brand (replaces `public/manifest.json`)
- `public/brand/solaris/icon-192.png`, `public/brand/solaris/icon-512.png`, `public/brand/solaris/wordmark.png` — Solaris assets

**Modify:**
- `src/app/layout.tsx` — metadata + JSON-LD + `<html data-brand>` + icons/theme-color from brand
- `src/app/globals.css` — `:root[data-brand="solaris"]` theme + `--on-primary` token
- `src/components/sidebar/Sidebar.tsx:121-124` — brand name/tagline + credit
- `src/app/om/page.tsx` — brand switch + brand metadata
- `src/app/opengraph-image.tsx` — brand title + gradient
- `src/app/sitemap.ts:4`, `src/app/robots.ts:9` — base URL from brand
- `src/lib/analytics.ts:9` — Plausible domain from brand
- `src/lib/import/exporter.ts:40,97` — GPX creator from brand
- `src/lib/pdf/generator.ts:339` — PDF attribution from brand
- `src/app/topografisk-kort-print/page.tsx:37,265,275` — FAQ text + links from brand
- `public/offline.html` — brand-neutral copy (static file, can't read env)
- `next.config.ts:9` — keep `mahoje.dk` image host, add nothing brand-specific (portrait only used by mahoje About)
- `Dockerfile` — `ARG NEXT_PUBLIC_BRAND`
- `package.json:2` — name stays `kort-mahoje` (cosmetic, untouched)
- Remove `public/manifest.json` (replaced by `app/manifest.ts`)

---

## Task 1: Brand registry (`src/config/brand.ts`)

**Files:**
- Create: `src/config/brand.ts`
- Test: `src/config/brand.test.ts`

**Interfaces:**
- Produces:
  - `type BrandId = "mahoje" | "solaris"`
  - `resolveBrandId(raw: string | undefined): BrandId`
  - `getBrand(id?: BrandId): Brand`
  - `interface Brand` with fields: `id`, `siteName`, `domain`, `baseUrl`, `description`, `ogDescription`, `tagline`, `keywords: string[]`, `logo: { icon192: string; icon512: string; wordmark: string; favicon: string }`, `themeColor: string`, `analyticsDomain: string`, `og: { title: string; gradient: string }`, `credit: { label: string; url: string; short: string }`, `github: string`, `jsonLdAuthor: { name: string; url: string }`

- [ ] **Step 1: Write the failing test**

```typescript
// src/config/brand.test.ts
import { describe, it, expect } from "vitest";
import { resolveBrandId, getBrand } from "./brand";

describe("resolveBrandId", () => {
  it("returns solaris for 'solaris'", () => {
    expect(resolveBrandId("solaris")).toBe("solaris");
  });
  it("defaults to mahoje for undefined", () => {
    expect(resolveBrandId(undefined)).toBe("mahoje");
  });
  it("defaults to mahoje for unknown values", () => {
    expect(resolveBrandId("bogus")).toBe("mahoje");
  });
});

describe("getBrand", () => {
  it("returns the mahoje brand set", () => {
    const b = getBrand("mahoje");
    expect(b.domain).toBe("kort.mahoje.dk");
    expect(b.baseUrl).toBe("https://kort.mahoje.dk");
    expect(b.credit.url).toBe("https://mahoje.dk");
  });
  it("returns the solaris brand set", () => {
    const b = getBrand("solaris");
    expect(b.domain).toBe("kort.solaris.dk");
    expect(b.baseUrl).toBe("https://kort.solaris.dk");
    expect(b.siteName).toBe("Kort.solaris.dk");
    expect(b.credit.label).toBe("Bygget af mahoje.dk");
    expect(b.credit.url).toBe("https://mahoje.dk");
    expect(b.github).toBe("https://github.com/mahope/kort");
  });
  it("has no residual mahoje domain in solaris output", () => {
    const b = getBrand("solaris");
    const blob = JSON.stringify({
      siteName: b.siteName, domain: b.domain, baseUrl: b.baseUrl,
      og: b.og, credit: { short: b.credit.short }, analyticsDomain: b.analyticsDomain,
    });
    expect(blob).not.toContain("mahoje.dk"); // credit.url intentionally excluded
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/brand.test.ts`
Expected: FAIL — "Failed to resolve import './brand'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/config/brand.ts
export type BrandId = "mahoje" | "solaris";

export interface Brand {
  id: BrandId;
  siteName: string;      // "Kort.solaris.dk"
  domain: string;        // "kort.solaris.dk"
  baseUrl: string;       // "https://kort.solaris.dk"
  description: string;
  ogDescription: string;
  tagline: string;       // "Gratis topografisk kortudskrivning"
  keywords: string[];
  logo: { icon192: string; icon512: string; wordmark: string; favicon: string };
  themeColor: string;    // manifest + <meta theme-color>
  analyticsDomain: string;
  og: { title: string; gradient: string };
  credit: { label: string; url: string; short: string };
  github: string;
  jsonLdAuthor: { name: string; url: string };
}

const KEYWORDS = [
  "topografisk kort", "kort udskrivning", "PDF kort", "Danmark kort",
  "gratis kort", "UTM gitter", "orientering", "spejder kort",
  "vandrekort", "Dataforsyningen",
];

const BRANDS: Record<BrandId, Brand> = {
  mahoje: {
    id: "mahoje",
    siteName: "Kort.mahoje.dk",
    domain: "kort.mahoje.dk",
    baseUrl: "https://kort.mahoje.dk",
    description:
      "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF. Gratis og uden login.",
    ogDescription:
      "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF.",
    tagline: "Gratis topografisk kortudskrivning",
    keywords: KEYWORDS,
    logo: {
      icon192: "/icons/icon.svg",
      icon512: "/icons/icon.svg",
      wordmark: "",
      favicon: "/icon.svg",
    },
    themeColor: "#2563eb",
    analyticsDomain: "kort.mahoje.dk",
    og: {
      title: "Kort.mahoje.dk",
      gradient:
        "linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #2563eb 100%)",
    },
    credit: {
      label: "Lavet af Mads Holst Jensen",
      url: "https://mahoje.dk",
      short: "kort.mahoje.dk",
    },
    github: "https://github.com/mahope/kort",
    jsonLdAuthor: { name: "Mads Holst Jensen", url: "https://mahoje.dk" },
  },
  solaris: {
    id: "solaris",
    siteName: "Kort.solaris.dk",
    domain: "kort.solaris.dk",
    baseUrl: "https://kort.solaris.dk",
    description:
      "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF. Gratis og uden login. En service fra spejderforeningen Solaris.",
    ogDescription:
      "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF.",
    tagline: "Gratis topografisk kortudskrivning",
    keywords: KEYWORDS,
    logo: {
      icon192: "/brand/solaris/icon-192.png",
      icon512: "/brand/solaris/icon-512.png",
      wordmark: "/brand/solaris/wordmark.png",
      favicon: "/brand/solaris/icon-192.png",
    },
    themeColor: "#f4d425",
    analyticsDomain: "kort.solaris.dk",
    og: {
      title: "Kort.solaris.dk",
      gradient:
        "linear-gradient(135deg, #171717 0%, #3d3a1a 55%, #f4d425 100%)",
    },
    credit: {
      label: "Bygget af mahoje.dk",
      url: "https://mahoje.dk",
      short: "kort.solaris.dk",
    },
    github: "https://github.com/mahope/kort",
    jsonLdAuthor: { name: "mahoje.dk", url: "https://mahoje.dk" },
  },
};

export function resolveBrandId(raw: string | undefined): BrandId {
  return raw === "solaris" ? "solaris" : "mahoje";
}

export function getBrand(id?: BrandId): Brand {
  const resolved = id ?? resolveBrandId(process.env.NEXT_PUBLIC_BRAND);
  return BRANDS[resolved];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/config/brand.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/config/brand.ts src/config/brand.test.ts
git commit -m "feat(brand): typed brand registry with env resolution"
```

---

## Task 2: Wire root layout + dynamic manifest to brand

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/manifest.ts`
- Delete: `public/manifest.json`

**Interfaces:**
- Consumes: `getBrand()` from Task 1.

- [ ] **Step 1: Replace `layout.tsx` metadata + head + JSON-LD with brand lookups**

Replace the whole file body with (keeps `themeScript` verbatim):

```tsx
import type { Metadata } from "next";
import { Analytics } from "@/components/Analytics";
import { getBrand, resolveBrandId } from "@/config/brand";
import "./globals.css";

const brand = getBrand();

export const metadata: Metadata = {
  title: {
    default: `${brand.siteName} - Gratis Topografisk Kortudskrivning`,
    template: `%s | ${brand.siteName}`,
  },
  description: brand.description,
  metadataBase: new URL(brand.baseUrl),
  alternates: { canonical: "/" },
  keywords: brand.keywords,
  authors: [brand.jsonLdAuthor],
  creator: brand.jsonLdAuthor.name,
  openGraph: {
    title: `${brand.siteName} - Gratis Topografisk Kortudskrivning`,
    description: brand.ogDescription,
    locale: "da_DK",
    type: "website",
    url: brand.baseUrl,
    siteName: brand.siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.siteName} - Gratis Topografisk Kortudskrivning`,
    description:
      "Udskriv danske topografiske kort i høj kvalitet som PDF. Gratis og uden login.",
  },
  icons: {
    icon: brand.logo.favicon,
    apple: brand.logo.icon192,
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const brandId = resolveBrandId(process.env.NEXT_PUBLIC_BRAND);
  return (
    <html lang="da" data-brand={brandId} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="theme-color" content={brand.themeColor} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: brand.siteName,
              url: brand.baseUrl,
              description:
                "Gratis webapplikation til udskrivning af danske topografiske kort som PDF. Vælg målestok, papirformat og download - helt uden login.",
              applicationCategory: "UtilityApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
              author: { "@type": "Person", ...brand.jsonLdAuthor },
              inLanguage: "da",
              isAccessibleForFree: true,
            }),
          }}
        />
        <Analytics />
        {children}
      </body>
    </html>
  );
}
```

Note: `<link rel="manifest">` is dropped from `<head>` — Next auto-links `app/manifest.ts`. Favicon/apple-icon now come from `metadata.icons`.

- [ ] **Step 2: Create dynamic manifest**

```typescript
// src/app/manifest.ts
import type { MetadataRoute } from "next";
import { getBrand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  const brand = getBrand();
  const png = brand.id === "solaris";
  return {
    name: `${brand.siteName} - Topografisk Kortudskrivning`,
    short_name: brand.siteName,
    start_url: "/",
    display: "standalone",
    theme_color: brand.themeColor,
    background_color: "#ffffff",
    description: "Gratis dansk topografisk kortudskrivning som PDF",
    lang: "da",
    icons: png
      ? [
          { src: brand.logo.icon192, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: brand.logo.icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ]
      : [
          { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
  };
}
```

- [ ] **Step 3: Delete the static manifest**

```bash
git rm public/manifest.json
```

- [ ] **Step 4: Verify mahoje build is unchanged**

Run: `npx next build` (no `NEXT_PUBLIC_BRAND` set → mahoje)
Then: `grep -R "kort.mahoje.dk" .next/server/app/index.html` (or run `npm start` and view source)
Expected: build succeeds; page `<title>` and JSON-LD still say `Kort.mahoje.dk`; `<html data-brand="mahoje">`; `/manifest.webmanifest` served with mahoje name.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/manifest.ts
git commit -m "feat(brand): brand-aware metadata, manifest and html data-brand"
```

---

## Task 3: Solaris theme + on-primary token + assets

**Files:**
- Modify: `src/app/globals.css`
- Create: `public/brand/solaris/icon-192.png`, `icon-512.png`, `wordmark.png`
- Modify (contrast fix): any component using `bg-primary` with `text-white`

**Interfaces:**
- Produces: CSS var `--color-on-primary` (Tailwind class `text-on-primary`), `[data-brand="solaris"]` theme.

- [ ] **Step 1: Copy Solaris assets into the repo**

```bash
mkdir -p public/brand/solaris
cp "/c/Projects/spejder/solaris/solaris/frontend/public/images/logo/cropped-Solaris-stjerne-gul-192x192.png" public/brand/solaris/icon-192.png
cp "/c/Projects/spejder/solaris/solaris/frontend/public/images/logo/logo-solaris-sort-gul.png" public/brand/solaris/wordmark.png
```

Generate a 512×512 icon from the star (ImageMagick if present, else upscale the 192):

```bash
magick public/brand/solaris/icon-192.png -resize 512x512 public/brand/solaris/icon-512.png \
  || cp public/brand/solaris/icon-192.png public/brand/solaris/icon-512.png
```

Verify: `ls -la public/brand/solaris/` shows three non-empty PNGs.

- [ ] **Step 2: Add `--on-primary` token + Solaris theme to `globals.css`**

In `:root` (light, mahoje default) add after `--text-muted`:
```css
  --on-primary: #ffffff;
```
In `.dark` add after `--text-muted`:
```css
  --on-primary: #ffffff;
```
In `@theme inline` add after `--color-text-muted`:
```css
  --color-on-primary: var(--on-primary);
```
Then append the Solaris overrides at the end of the variable blocks (after `.dark {}` closes, before `@theme inline`):
```css
:root[data-brand="solaris"] {
  --foreground: #171717;
  --primary: #f4d425;
  --primary-hover: #e0c115;
  --on-primary: #171717;
  --sidebar-bg: #fffef7;
  --sidebar-border: #efe7b8;
  --accent: #f4d425;
  --surface: #ffffff;
  --surface-secondary: #faf7e8;
  --border: #e8e2c4;
  --text-secondary: #57534e;
  --text-muted: #a8a29e;
}

:root[data-brand="solaris"].dark {
  --background: #0c0a09;
  --foreground: #f5f5f4;
  --primary: #f4d425;
  --primary-hover: #ffe14d;
  --on-primary: #171717;
  --sidebar-bg: #1c1917;
  --sidebar-border: #3f3a2a;
  --accent: #f4d425;
  --surface: #1c1917;
  --surface-secondary: #292524;
  --border: #44403c;
  --text-secondary: #a8a29e;
  --text-muted: #78716c;
}
```

- [ ] **Step 3: Fix `text-white`-on-`bg-primary` contrast (yellow needs dark text)**

Find them:
```bash
grep -rn "bg-primary" src --include=*.tsx | grep "text-white"
```
For each match (expected: About CTA `src/app/om/page.tsx:182`, and `src/components/print/PrintButton.tsx` if present), change `text-white` → `text-on-primary`. Leave `bg-primary` buttons that already use a non-white text alone.

- [ ] **Step 4: Build + eyeball both brands**

Run: `NEXT_PUBLIC_BRAND=solaris npx next build && NEXT_PUBLIC_BRAND=solaris npm start`
Expected: sidebar/buttons show yellow primary with dark text; links readable; `<html data-brand="solaris">`. Then rebuild default and confirm mahoje unchanged (blue).

- [ ] **Step 5: Commit**

```bash
git add public/brand/solaris src/app/globals.css src/app/om/page.tsx src/components/print/PrintButton.tsx
git commit -m "feat(brand): Solaris theme, assets and on-primary contrast token"
```

---

## Task 4: Sidebar brand name, tagline & credit

**Files:**
- Modify: `src/components/sidebar/Sidebar.tsx`

**Interfaces:**
- Consumes: `getBrand()`.

- [ ] **Step 1: Import brand + replace the hardcoded header (lines ~120-125)**

At the top of `Sidebar.tsx` add:
```tsx
import { getBrand } from "@/config/brand";
```
Inside `SidebarContent()` before `return (` add:
```tsx
  const brand = getBrand();
```
Replace:
```tsx
      <div>
        <h1 className="text-lg font-bold">Kort.mahoje.dk</h1>
        <p className="text-xs text-text-secondary">
          Gratis topografisk kortudskrivning
        </p>
      </div>
```
with:
```tsx
      <div>
        <h1 className="text-lg font-bold">{brand.siteName}</h1>
        <p className="text-xs text-text-secondary">{brand.tagline}</p>
        {brand.id === "solaris" && (
          <a
            href={brand.credit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-text-muted hover:text-text-secondary underline underline-offset-2"
          >
            {brand.credit.label}
          </a>
        )}
      </div>
```

- [ ] **Step 2: Build check**

Run: `NEXT_PUBLIC_BRAND=solaris npx next build`
Expected: success; rendered sidebar `<h1>` = `Kort.solaris.dk` with a "Bygget af mahoje.dk" link.

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar/Sidebar.tsx
git commit -m "feat(brand): brand-aware sidebar header + Solaris credit"
```

---

## Task 5: About page — split by brand

**Files:**
- Create: `src/components/about/AboutMahoje.tsx`
- Create: `src/components/about/AboutSolaris.tsx`
- Modify: `src/app/om/page.tsx`

**Interfaces:**
- Consumes: `getBrand()`. Each About component is a default-exported React component taking no props.

- [ ] **Step 1: Move current About content into `AboutMahoje.tsx`**

Create `src/components/about/AboutMahoje.tsx` containing the **current** JSX from `src/app/om/page.tsx` (everything returned by `AboutPage()`), as a component:
```tsx
import Image from "next/image";
import Link from "next/link";

export default function AboutMahoje() {
  return (
    /* paste the exact <div className="min-h-screen ..."> ... </div> block
       currently in src/app/om/page.tsx lines 12-227, unchanged */
  );
}
```
(Keep the GitHub link at `https://github.com/mahope/kort` — fix the existing `mahoje/kort` typo to `mahope/kort` on lines 147 & 197 while moving.)

- [ ] **Step 2: Write `AboutSolaris.tsx`**

```tsx
import Link from "next/link";
import { getBrand } from "@/config/brand";

export default function AboutSolaris() {
  const brand = getBrand("solaris");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors mb-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Tilbage til kortet
        </Link>

        <h1 className="text-3xl font-bold mb-2">Om {brand.siteName}</h1>
        <p className="text-text-secondary mb-10">
          En gratis service til udskrivning af danske topografiske kort
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">Hvorfor?</h2>
            <p className="text-text-secondary">
              Vi er Solaris, en spejdergruppe under Det Danske Spejderkorps. På
              ture og til orientering har vi tit manglet en nem, gratis måde at
              udskrive et ordentligt topografisk kort &mdash; et rigtigt kort på
              papir, til at lære at læse kort og finde vej i naturen. Der fandtes
              ikke en god dansk service til det, så vi fik den bygget. Den er
              gratis og forbliver det.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Hvad kan den?</h2>
            <ul className="space-y-2 text-text-secondary">
              {[
                "Udskriv danske topografiske kort som PDF i flere målestoksforhold",
                "Vælg mellem papirformater fra A5 til A2, stående eller liggende",
                "UTM-gitter med koordinater — til orientering i felten",
                "Højdekurver, skyggekort, matrikelskel og stednavne som overlay",
                "Importer GPX- og GeoJSON-ruter og print dem direkte",
                "Tegn og mål direkte på kortet",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-primary mt-0.5">&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Altid gratis</h2>
            <p className="text-text-secondary">
              {brand.siteName} er gratis og kommer altid til at forblive det.
              Ingen login, ingen cookies. Vi bruger{" "}
              <a href="https://plausible.io/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover underline underline-offset-2">
                Plausible Analytics
              </a>{" "}
              til anonym, cookieless brugsstatistik. Kortdata kommer fra{" "}
              <a href="https://dataforsyningen.dk/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover underline underline-offset-2">
                Dataforsyningen
              </a>{" "}
              (Klimadatastyrelsen), som stiller frie offentlige geodata til
              rådighed for alle.
            </p>
          </section>

          <section className="rounded-xl bg-surface-secondary p-6">
            <h2 className="text-lg font-semibold mb-3">Bygget af mahoje.dk</h2>
            <p className="text-text-secondary mb-4">
              Denne kortprinter er udviklet og drevet af{" "}
              <a href={brand.credit.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover underline underline-offset-2">
                mahoje.dk
              </a>{" "}
              &mdash; som også har bygget den bagvedliggende{" "}
              <a href={brand.github} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover underline underline-offset-2">
                open source-kode
              </a>. Tak for det!
            </p>
            <a
              href={brand.credit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-hover transition-colors"
            >
              Besøg mahoje.dk
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border text-xs text-text-muted">
          Kortdata &copy; Klimadatastyrelsen |{" "}
          <a href="https://dataforsyningen.dk/" target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary">
            Dataforsyningen
          </a>{" "}
          | {brand.credit.label}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `om/page.tsx` to switch + brand metadata**

```tsx
import type { Metadata } from "next";
import { getBrand } from "@/config/brand";
import AboutMahoje from "@/components/about/AboutMahoje";
import AboutSolaris from "@/components/about/AboutSolaris";

const brand = getBrand();

export const metadata: Metadata = {
  title: `Om ${brand.siteName} - Gratis Topografisk Kortudskrivning`,
  description: `Om ${brand.siteName} - en gratis service til at udskrive danske topografiske kort som PDF.`,
};

export default function AboutPage() {
  return getBrand().id === "solaris" ? <AboutSolaris /> : <AboutMahoje />;
}
```

- [ ] **Step 4: Build both brands**

Run: `NEXT_PUBLIC_BRAND=solaris npx next build` then default `npx next build`.
Expected: both succeed. `/om` renders Solaris content (no portrait, no email, mahoje credit) under solaris; original personal page under mahoje.

- [ ] **Step 5: Commit**

```bash
git add src/components/about src/app/om/page.tsx
git commit -m "feat(brand): split About page into per-brand components"
```

---

## Task 6: Remaining string touchpoints

**Files:**
- Modify: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/analytics.ts`, `src/lib/import/exporter.ts`, `src/lib/pdf/generator.ts`, `src/app/topografisk-kort-print/page.tsx`, `src/app/opengraph-image.tsx`, `public/offline.html`

**Interfaces:**
- Consumes: `getBrand()`.

- [ ] **Step 1: sitemap + robots base URL**

`src/app/sitemap.ts:4` — replace `const baseUrl = "https://kort.mahoje.dk";` with:
```typescript
import { getBrand } from "@/config/brand";
// ...
  const baseUrl = getBrand().baseUrl;
```
`src/app/robots.ts:9` — replace the hardcoded `sitemap: "https://kort.mahoje.dk/sitemap.xml"` with:
```typescript
import { getBrand } from "@/config/brand";
// ...
    sitemap: `${getBrand().baseUrl}/sitemap.xml`,
```

- [ ] **Step 2: analytics domain**

`src/lib/analytics.ts` — add `import { getBrand } from "@/config/brand";` and replace `domain: "kort.mahoje.dk",` with `domain: getBrand().analyticsDomain,`.

- [ ] **Step 3: GPX creator**

`src/lib/import/exporter.ts` — add import; replace line 40 `creator="kort.mahoje.dk"` → `creator="${getBrand().credit.short}"` (ensure that string is inside a template literal; if not, convert), and line 97 `<name>Eksport fra kort.mahoje.dk</name>` → `<name>Eksport fra ${getBrand().credit.short}</name>`.

- [ ] **Step 4: PDF attribution**

`src/lib/pdf/generator.ts:339` — add import; replace `const attribution = "Kortdata: Klimadatastyrelsen | kort.mahoje.dk";` with:
```typescript
const attribution = `Kortdata: Klimadatastyrelsen | ${getBrand().credit.short}`;
```

- [ ] **Step 5: topografisk-kort-print landing page**

`src/app/topografisk-kort-print/page.tsx` — add import. Replace the FAQ answer at line 37 (`Kort.mahoje.dk er helt gratis...`) `Kort.mahoje.dk` → `${getBrand().siteName}` (template literal). Replace GitHub link at 265 `https://github.com/mahoje/kort` → `getBrand().github`. Replace mahoje link at 275 `https://mahoje.dk` → `getBrand().credit.url` and its visible label to `getBrand().credit.label` if it names mahoje.

- [ ] **Step 6: OpenGraph image**

`src/app/opengraph-image.tsx` — add `import { getBrand } from "@/config/brand";`, then inside `OgImage()` add `const brand = getBrand();`. Replace `alt` export usage and the two hardcoded strings/gradient:
  - top-level `export const alt = \`${getBrand().siteName} - Gratis Topografisk Kortudskrivning\`;`
  - `background: "linear-gradient(...)"` → `background: brand.og.gradient,`
  - the title `<div>Kort.mahoje.dk</div>` → `{brand.og.title}`

- [ ] **Step 7: offline.html (static — brand-neutral)**

`public/offline.html` is served by the service worker and cannot read env. Replace the two `Kort.mahoje.dk` occurrences (lines 6, 18) with the neutral wording `Kortprinter` / "Kortprinteren kræver en internetforbindelse..." so it reads correctly for both brands.

- [ ] **Step 8: Verify no residual domain leaks per brand**

Run:
```bash
NEXT_PUBLIC_BRAND=solaris npx next build
grep -RIl "kort.mahoje.dk" .next/server/app 2>/dev/null
```
Expected: **no output** (no mahoje domain in the Solaris build). Then default build and confirm the mahoje build still contains `kort.mahoje.dk`.

- [ ] **Step 9: Run unit tests + commit**

Run: `npx vitest run`
Expected: PASS.
```bash
git add src/app/sitemap.ts src/app/robots.ts src/lib/analytics.ts src/lib/import/exporter.ts src/lib/pdf/generator.ts src/app/topografisk-kort-print/page.tsx src/app/opengraph-image.tsx public/offline.html
git commit -m "feat(brand): route remaining URLs, attribution and OG image through brand"
```

---

## Task 7: Dockerfile build ARG + full build verification

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Add the build ARG to the builder stage**

In `Dockerfile`, in the `builder` stage, before `RUN npm run build`, insert:
```dockerfile
ARG NEXT_PUBLIC_BRAND=mahoje
ENV NEXT_PUBLIC_BRAND=$NEXT_PUBLIC_BRAND
```

- [ ] **Step 2: Build the Solaris image locally and verify branding is baked in**

```bash
docker build --build-arg NEXT_PUBLIC_BRAND=solaris -t kort-solaris:test .
docker run --rm -p 3001:3000 kort-solaris:test &
sleep 3
curl -s http://localhost:3001/ | grep -o 'data-brand="[a-z]*"'      # expect data-brand="solaris"
curl -s http://localhost:3001/ | grep -o 'Kort.solaris.dk' | head -1 # expect a match
curl -s http://localhost:3001/manifest.webmanifest | grep solaris    # expect solaris name
docker stop $(docker ps -q --filter ancestor=kort-solaris:test)
```
Expected: `data-brand="solaris"`, `Kort.solaris.dk` present, manifest names Solaris.

- [ ] **Step 3: Build the default (mahoje) image and verify unchanged**

```bash
docker build -t kort-mahoje:test .
docker run --rm -p 3002:3000 kort-mahoje:test &
sleep 3
curl -s http://localhost:3002/ | grep -o 'data-brand="[a-z]*"'  # expect data-brand="mahoje"
docker stop $(docker ps -q --filter ancestor=kort-mahoje:test)
```
Expected: `data-brand="mahoje"`.

- [ ] **Step 4: Commit + push (triggers kort.mahoje.dk rebuild — verify it stays identical)**

```bash
git add Dockerfile
git commit -m "build(brand): NEXT_PUBLIC_BRAND build arg for env-branded images"
git push origin main
```
After the mahoje deploy finishes, load kort.mahoje.dk and confirm it is visually unchanged.

---

## Task 8: Deploy kort.solaris.dk (ops)

**Files:** none (infrastructure). Uses Solaris-Dokploy API (`https://panel.solaris.dk/api`, `x-api-key`) and Cloudflare (Solaris DNS account `a889b25410512ff2c45354ca05c14336`).

- [ ] **Step 1: Create the Solaris compose in Dokploy**

In a Solaris project, create a Compose service pointing at GitHub `mahope/kort`, branch `main`, using the repo `docker-compose.yml` (or a Dockerfile build). Set build arg / service so the image builds with `NEXT_PUBLIC_BRAND=solaris`. A minimal compose for the service:
```yaml
services:
  kort:
    build:
      context: .
      args:
        NEXT_PUBLIC_BRAND: solaris
    environment:
      - NEXT_PUBLIC_BRAND=solaris
    restart: unless-stopped
```
Enable `autoDeploy=true` on push to `main`. Add a domain `kort.solaris.dk` (Traefik, port 3000, LetsEncrypt) via `domain.create`.

- [ ] **Step 2: DNS**

Create a proxied `A`/`CNAME` `kort.solaris.dk` → Solaris-Dokploy (`135.181.148.13`) in the Solaris Cloudflare zone.

- [ ] **Step 3: Deploy + end-to-end verify**

Trigger `compose.deploy`. Then verify on `https://kort.solaris.dk`:
- Loads; `<html data-brand="solaris">`; yellow Solaris chrome; sidebar shows `Kort.solaris.dk` + "Bygget af mahoje.dk".
- `/om` = Solaris text, mahoje credit, links to `github.com/mahope/kort`, no email.
- Address search (DAWA) returns results.
- Generate a PDF → attribution reads `... | kort.solaris.dk`.
- PWA installable; favicon = Solaris star.
- `curl -s https://kort.solaris.dk/robots.txt` and `/sitemap.xml` reference `kort.solaris.dk`.

- [ ] **Step 4: Update memory**

Record the new site (domain, Dokploy compose id, brand build-arg, shared repo) in the Solaris auto-memory and link `[[dokploy-migration]]`.

---

## Self-Review Notes

- **Spec coverage:** brand register (Task 1) ✓; theme+identity (Task 3) ✓; logo/PWA (Tasks 2,3) ✓; About + mahoje credit everywhere (Tasks 4,5,6) ✓; deployment + build-arg (Tasks 7,8) ✓; data sources untouched ✓; no-email/mahope-github decisions ✓.
- **Contrast:** yellow-primary handled via `--on-primary` dark text token + explicit `text-white`→`text-on-primary` swap (Task 3 Step 3).
- **Type consistency:** `getBrand()`/`resolveBrandId()`/`Brand` fields used identically across Tasks 2-6 as defined in Task 1.
- **Build-time env:** enforced in Dockerfile (Task 7) and verified by grep-for-leak (Task 6 Step 8) and container checks (Task 7).
