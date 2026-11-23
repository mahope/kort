# Dependency security

Status 23 Nov 2026 (issue #29, refreshed in the code cleanup). `npm audit` reports 0 vulnerabilities, with and without dev dependencies.

## Policy

- Changed direct dependencies are pinned to an exact version (no `^`).
- A version is only adopted when it is at least 3 days old (`npm view <pkg> time`).
- Install with `npm install --save-exact --ignore-scripts --before=<date 3+ days ago> <pkg>@<version>`.
- CI runs `npm audit --omit=dev --audit-level=high` (see `.github/workflows/ci.yml`).

## Production fixes (issue #29)

| Package | Before | After | Published | Finding |
|---|---|---|---|---|
| `maplibre-gl` (direct) | 5.24.0 | 6.16.0 | 2026-10-25 | critical, GHSA-jrc7-96c5-q579 (XSS via `DOM.sanitize()`) |
| `react-map-gl` (direct) | ^8.1.1 | 8.1.3 | 2026-09-02 | needed for maplibre-gl 6 (8.1.1 crashes on `transform.center`) |
| `dompurify` (via jspdf) | 3.4.14 | 3.4.17 | 2026-10-12 | critical, five GHSAs |
| `fflate` (via jspdf) | 0.8.2 | 0.8.3 | 2026-05-16 | moderate, GHSA-px8p-9vwx-vf98 |
| `source-map-js` (via postcss) | 1.2.1 | 1.2.2 | 2026-09-30 | high, GHSA-68fv-2mgg-jv7q |

Dev-only packages were refreshed by `npm audit fix` inside the lockfile (vite 8.3.5, vitest 4.1.12, undici 7.30.1, zod 4.6.7, brace-expansion, typescript-eslint 8.72.1 and others); all are at least 3 days old.

## Code changes required by maplibre-gl 6

- The package is ESM-only with no default export: `src/lib/pdf/renderer.ts` uses `import * as maplibregl`.
- `maxBounds` takes a flat `[west, south, east, north]` array: `src/components/map/MapContainer.tsx`.
- The web worker is a separate file resolved from `import.meta.url`, which points into a bundler chunk. `src/lib/map/workerUrl.ts` calls `setWorkerUrl()` with the bundled `maplibre-gl-worker.mjs` asset; without it tiles never load ("Worker failed to load"). The CSP already allows `worker-src 'self'`.

## Refresh 23 Nov 2026

Everything below was installed with `--save-exact --ignore-scripts --before=2026-11-20`; every changed lockfile entry (141) was checked against the registry and is at least 3 days old.

| Package | Before | After | Published |
|---|---|---|---|
| `@plausible-analytics/tracker` | 0.4.5 | 0.4.7 | 2026-10-28 |
| `@tmcw/togeojson` | 7.1.2 | 7.1.4 | 2026-11-16 |
| `maplibre-gl` | 6.16.0 | 6.19.0 | 2026-11-17 |
| `react`, `react-dom` | 19.2.7 | 19.3.1 | 2026-10-14 |
| `terra-draw` | 1.31.2 | 1.40.0 | 2026-11-15 |
| `terra-draw-maplibre-gl-adapter` | 1.4.1 | 1.5.0 | 2026-10-06 |
| `zustand` | 5.0.14 | 5.1.0 | 2026-11-06 |
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.2 | 4.3.5 | 2026-11-06 |
| `@types/react` | 19.2.17 | 19.3.0 | 2026-09-09 |
| `@types/react-dom` | 19.2.3 | 19.3.0 | 2026-09-09 |
| `@vitejs/plugin-react` | 6.0.3 | 6.3.0 | 2026-11-09 |
| `oxlint` | 1.90.0 | 1.94.0 | 2026-11-16 |
| `eslint` (major) | 9.39.4 | 10.15.0 | 2026-11-13 |
| `vitest` (major) | 4.1.12 | 5.1.1 | 2026-11-18 |
| `jsdom` (major) | 29.1.1 | 31.0.1 | 2026-11-13 |
| `minimatch` (via `typescript-eslint` 8.72.1 to 8.73.0) | 10.2.6 | 11.0.9 | 2026-11-16 |

Already at the newest eligible version and left alone: `next` and `eslint-config-next` (16.4.6), `jspdf`, `pmtiles`, `mgrs`, `react-map-gl`. Deliberately not bumped: `@types/node` stays on 22 (Node 22 runtime, `node:22-alpine` in the Dockerfile) and `typescript` stays on 6.x because Next and ESLint use it (type checking runs on the `typescript7` alias).

Notes on the majors:

- `vitest` 5 and `jsdom` 31 pass all 495 tests unchanged. jsdom 31 needs Node `^22.22.2 || ^24.15.0 || >=26`; CI runs the latest Node 22. Lint, typecheck and tests were run on Node 22.23.5 and 24.22.3.
- `eslint` 10: `eslint-config-next` 16.4.6 declares `eslint >=9`, but its bundled plugins (`eslint-plugin-react` 7.37.5, `eslint-plugin-import` 2.32.0, `eslint-plugin-jsx-a11y` 6.10.2) do not list ESLint 10 in their peer ranges yet, so npm prints "Conflicting peer dependency" warnings for `eslint-plugin-react` (exit code 0; `npm ci` and `npm install` work). A probe file covering the react-hooks, react, jsx-a11y and `@next/next` rules gives identical findings under ESLint 9.39.4 and 10.15.0. ESLint 9.39.5 is already marked as no longer supported upstream, so the way back (`npm install --save-exact eslint@9.39.5`) is a last resort if a plugin breaks.
- Dependabot alert #56 (`minimatch`, GHSA-g3hv-75wg-m249, dev scope) is fixed by `typescript-eslint` 8.73.0, which depends on `minimatch` ^11.0.1. This also cleared the 8 moderate findings in the lint toolchain that earlier versions of this page listed as remaining.

## Remaining findings

None. `npm audit` and `npm audit --omit=dev` both report 0 vulnerabilities.

## Exploitability note

kort uses neither `Popup`, `setHTML` nor `jsPDF.html()`, and sends no untrusted HTML to MapLibre's sanitizer (attribution is static). The practical risk of the old versions was low; the upgrade clears the alarms.

## Verification

Playwright against `next start` before and after (390 and 1440 px, screenshots in `docs/screenshots/issue-29/`): all 6 base layers, the 4 overlays, drawing, GPX import and an A4 PDF download (525381 bytes before, 525384 after), no page errors.

The 23 Nov 2026 refresh was checked the same way, comparing a build of `main` (40f9fb2) with the cleanup branch: the map at 1440 and 390 px, a drawn line (terra-draw), `/om`, `/kilder` and `/topografisk-kort-print` give pixel-identical screenshots (same checksums), the HTML of the three static pages is identical, a GPX import (togeojson) works, and an A4 1:25.000 PDF downloads (3376719 bytes before, 3376712 after). No page errors.
