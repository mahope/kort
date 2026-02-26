# kort.mahoje.dk

Gratis webapplikation til udskrivning af danske topografiske kort som PDF.

## Tech Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5.7**
- **MapLibre GL JS 5** via react-map-gl for interaktivt kort
- **Tailwind CSS 4.2** (CSS-first config i globals.css)
- **Zustand 5** for state management
- **jsPDF 4** for client-side PDF-generering
- **Vitest 4** for tests

## Arkitektur

- Kortdata: Dataforsyningens vector tiles (EPSG:3857), gratis token
- PDF: Client-side med skjult MapLibre-instans ved fuld target-opløsning
- Søgning: DAWA API (adresser + stednavne), ingen token

## Kommandoer

- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npx vitest run` - Kør tests
- `npx tsc --noEmit` - Type-check

## Mappestruktur

- `src/app/` - Next.js app router (page, layout, globals)
- `src/components/` - React components (map/, sidebar/, search/, print/, ui/)
- `src/lib/` - Utility/business logic (map/, pdf/, api/, geo/)
- `src/stores/` - Zustand stores (mapStore, printStore, uiStore)
- `src/types/` - TypeScript types (map.ts, print.ts)
- `src/constants/` - Constants (scales, paperFormats)

## Konventioner

- Alle komponenter er "use client" (kort-app kræver browser APIs)
- MapContainer importeres dynamisk med `ssr: false`
- Tailwind-klasser, ingen separate CSS-filer
- Dansk UI-tekst, engelske kode-identifikatorer
