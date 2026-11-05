# Dependency security

Status 5 Nov 2026 (issue #29). `npm audit --omit=dev` reports 0 vulnerabilities.

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

## Remaining findings

`npm audit` (including dev dependencies) still lists 8 moderate findings in the lint toolchain (`typescript-eslint` and its transitive `@typescript-eslint/*` dependencies). They are not shipped to users and have no non-breaking fix yet.

## Exploitability note

kort uses neither `Popup`, `setHTML` nor `jsPDF.html()`, and sends no untrusted HTML to MapLibre's sanitizer (attribution is static). The practical risk of the old versions was low; the upgrade clears the alarms.

## Verification

Playwright against `next start` before and after (390 and 1440 px, screenshots in `docs/screenshots/issue-29/`): all 6 base layers, the 4 overlays, drawing, GPX import and an A4 PDF download (525381 bytes before, 525384 after), no page errors.
