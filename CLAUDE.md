# kort.mahoje.dk

Free web app that prints Danish topographic maps as PDF. **Public, open source
repo (MIT).** Everything committed here is visible to everyone.

## Public repo rules

- Never commit secrets or personal data (no customer data, no private addresses,
  no names from user reports). gitleaks runs over the full history in CI;
  `.gitleaksignore` only lists the public-by-design Dataforsyningen token
  (`docs/tokens.md`).
- The two `NEXT_PUBLIC_*` tokens are public by design. Anything secret must go
  through a server-side route, never a `NEXT_PUBLIC_` variable.
- No AI attribution in commits, PRs, README or code comments.
- Code is MIT; map data, fonts and brand assets are not. See `NOTICE.md`.

## Data, licences and credit (do not break)

- Every base map and overlay must be listed in `src/constants/dataSources.ts`
  with licence, licence URL and required credit; a test fails otherwise, and
  `/kilder` renders the list. Update `NOTICE.md` when a source or licence changes.
- The credit must show on the map (MapLibre attribution + link to `/kilder`)
  and in the PDF footer (`kdsPrintCredit` / `nordicPrintCredit` in
  `src/lib/map/sources.ts`). Danmarks Dybdemodel (DDM50) is **not** CC BY: it
  needs its own credit sentence, terms link and "not for navigation".
- No offline caching of OpenTopoMap or Kartverket tiles, and no Geovekst/FKB
  data in PDFs for Norway (`docs/nordic.md`).
- New external domain: add it to the CSP in `next.config.ts` (`docs/security.md`).

## Tech stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript 6 (TypeScript 7 via
  the `typescript7` alias for `npm run typecheck`)
- MapLibre GL JS 6 via react-map-gl, PMTiles for our own contours
- Tailwind CSS 4.3 (CSS-first config in `globals.css`), Zustand 5, jsPDF 4, Terra Draw
- Vitest 5, ESLint 10, oxlint

## Architecture

- Map data: Dataforsyningen vector tiles and WMS (EPSG:3857); Kartverket and
  OpenTopoMap outside Denmark (`src/lib/geo/regions.ts`)
- PDF: client-side, a hidden MapLibre instance at target resolution (`src/lib/pdf/`)
- Search: Adressevælger (addresses, EPSG:25832 → WGS84) + our own
  `/api/stednavne` over the Danske Stednavne snapshot (`data/stednavne.tsv.gz`);
  DAWA closed on 1 Oct 2026
- Brands: `NEXT_PUBLIC_BRAND=mahoje|solaris` (`src/config/brand.ts`). The same
  code serves kort.mahoje.dk and kort.solaris.dk; check UI changes in both.
- Analytics: Plausible, only initialised on the brand's own production domain
  (`src/lib/analytics.ts`)

## Commands

- `npm run dev`, `npm run build`
- `npx vitest run`, `npm run typecheck`, `npm run lint` (authoritative),
  `npm run lint:fast` (oxlint pre-check)
- Unused code: `npx knip@6.44.1` (false positives are listed in `knip.json`)

## Folders

- `src/app/` routes: `/`, `/om`, `/kilder`, `/topografisk-kort-print`, `/api/stednavne`
- `src/components/` map/, sidebar/, search/, print/, ui/, about/
- `src/lib/` map/, pdf/, geo/, api/, stednavne/, import/, offline/, url/, ui/
- `src/stores/` Zustand stores; `src/constants/` scales, paper formats, data sources
- `docs/` English docs (nordic, grids-and-declination, security, tokens,
  dependency-security, maintenance); `docs/screenshots/readme/` for the README

## Conventions

- All components are "use client"; MapContainer is imported with `ssr: false`
- Tailwind classes, no separate CSS files; shared link classes in `src/lib/ui/linkClasses.ts`
- UI text in Danish; code, identifiers, comments, README and docs in English
- Commit messages: Danish, imperative (repo history). PR titles and bodies: English.
- Update README/docs in the same PR when behaviour changes; new UI needs
  screenshots (desktop + mobile) in the PR.
- Dependencies: exact versions, at least 3 days old (`docs/dependency-security.md`).
  Dependabot ignores majors of `typescript` (Next needs 6) and `@types/node`
  (runtime is Node 22).

## Workflow, deploy and releases

- Work on a branch, open a PR, CI must be green (build, lint, typecheck, tests,
  gitleaks; audit is non-blocking), fresh-context review without P1, then merge.
- Every merge to `main` auto-deploys both kort.mahoje.dk and
  kort.solaris.dk (Dokploy). Live-check both afterwards: 200, map
  loads, PDF downloads, credit shows.
- Releases: add an entry to `CHANGELOG.md`, keep `package.json` version in
  sync, tag `vX.Y.Z` on main and publish a GitHub release (PATCH steps; check
  the highest existing tag first). First release: v0.1.0 (23 Nov 2026).
- Roadmap and bugs live in GitHub issues.
