# MGRS grids and point coordinates

Implemented on `feat/mgrs-gitter`. No deploy and no PR created.

## Behaviour

- Choose UTM or WGS84 MGRS under **Koordinatgitter**. Selection persists in
  localStorage and `cs=utm|mgrs` URLs, including when the grid is switched off.
  Old `g=1` URLs still select UTM.
- MGRS retains the existing spacing/density controls (100 m–10 km), including
  1 km/10 km lines and their hierarchy. Margin labels identify the zone,
  latitude band, 100 km square and kilometre digits inside the square.
- Open **Koordinat ved sigtekorset**, then pan the target under the centre
  crosshair. Copy MGRS with 10 digits (1 m) or 8 digits (10 m), standard-zone
  UTM, or WGS84 decimal latitude/longitude. Available on desktop and mobile.
  Precision is the representation's resolution, not a claim of positional accuracy.
- Standard UTM/MGRS geometry is partitioned and clipped at zone boundaries,
  including 12°E. Copenhagen and Bornholm use zone 33; west of 12°E uses 32.
  The explicit Danish UTM convention using zone 32 everywhere remains available.
- Screen and PDF use the same clipped geometry. PDF labels intersect the
  projected lines, including rotated and multi-page output. MGRS PDF labels
  place zone/band above square/digits to fit the existing margins.
- Optional geographic degree/minute grid was not added. Geographic point
  coordinates are available as decimal degrees.

## Validation

- `npm run build`: passed, all 11 routes generated/collected.
- `npx vitest run`: **15 test files, 138 tests passed**.
- `npm run lint`: exit 0, no errors; six existing unused-variable warnings in
  `public/sw.js`, `measure.ts`, `generator.ts`, `renderer.ts`, `printStore.ts`.
- New reference tests: Rådhuspladsen (55.6761, 12.5683) gives
  `33U UB 47090 72711`; Rønne (55.101, 14.706) gives
  `33U VB 81240 06070`. Both match GeographicLib GeoConvert with WGS84,
  standard zone and metre precision, independently queried 5 November 2026.
  Tests also cover 10 m truncation/leading zeros, zones on both sides of 12°E,
  Bornholm, explicit Danish mode, Norway, clipping and rotated PDF intersections.
- Playwright uses the existing server installation and sandboxed Chrome Stable.
  `scripts/capture-mgrs.mjs` owns its foreground local server and stops it in
  `finally`. Screenshots cover 390/1440 px and light/dark, Bornholm and a rotated
  zone boundary. Browser checks cover all four clipboard values, URL reload,
  localStorage, horizontal overflow, runtime errors and actual PDF downloads.
  Results are in `browser-results.json`. Some DTK25 base-map tiles were still
  blank in desktop captures; grid/readout rendering and PDF downloads succeeded.
  This task did not change or diagnose the external tile service.
- Single-page PDF: rotated 37°, 1:100000, 150 DPI, crossing 12°E. PDF text checked
  for both zone designators and both square identifiers.
- Multi-page PDF: two sheets, 1:50000, 150 DPI, crossing 12°E. PDF text checked
  for both zones and page names. These PDFs can be printed using a PDF viewer;
  a physical printer was not tested.
- No fresh-context PR review was run here, per the task's instruction to do the
  complete PR review once from Mads' PC. No separate React Doctor package was
  installed or run.

Reproduce after `npm run build` with an existing Playwright installation:

```bash
KORT_PLAYWRIGHT_MODULE=/home/mads/dev/shots/node_modules/playwright/index.mjs \
  node scripts/capture-mgrs.mjs
```

## New dependency assessment

**Conclusion: install with `--ignore-scripts`.** Installed and pinned `mgrs@2.2.0`.

- Maintained by the proj4js team; npm maintainers Andreas Hocevar, Calvin
  Metcalf and Daniel Dufour. Package history dates to December 2013.
- Version 2.2.0 was released **11 July 2026**, well over three days before this
  work; previous stable 2.1.0 was released 5 January 2025. No unusual rapid release.
- No runtime dependencies and no install/preinstall/postinstall/prepare scripts.
  Package scripts are development build/test/lint commands.
- Source and published ESM inspected: no environment-variable access, runtime
  network calls, dynamic evaluation or external imports at load. Pure local
  coordinate conversion, bundled types, MIT licence.
- `package-lock.json` adds only this package; existing platform metadata retained.
- `npm audit` reports no advisory for `mgrs`. It reports 18 advisories in the
  existing dependency tree (11 moderate, 5 high, 2 critical). No unrelated
  dependency upgrades were made.

Sources:
- https://registry.npmjs.org/mgrs
- https://github.com/proj4js/mgrs
- https://geographiclib.sourceforge.io/cgi-bin/GeoConvert

## Delivery and push blocker

The first checkpoint is `d370cf7` (`wip: Add MGRS grids and point coordinates`).
Final changes and evidence are committed separately on the same local branch.

Push to the configured origin (`git@git.mahoje.dk:mahope/kort.git`) was attempted
and refused: **“Mirror Repository mahope/kort is read-only”**. The GitHub API
identifies `mahope/kort` as non-archived with `mirror_url: null`; the worker's
GitHub SSH access fails with **“Permission denied (publickey)”**. The origin was
not changed and no credentials were changed. Push remains blocked by access.
A git bundle is saved at
`/home/mads/dev/arkiv-rapporter/kort-mgrs-gitter-20261105.bundle` as an additional
transfer route. Copy it to the PC, then in the existing repo:

```bash
git fetch /path/to/kort-mgrs-gitter-20261105.bundle \
  refs/heads/feat/mgrs-gitter:refs/heads/feat/mgrs-gitter
```

Push that branch to the confirmed writable source from the PC. Do not push to
an assumed mirror. Suggested PR title: **Add MGRS grids and mobile point coordinates**.

Suggested PR description:

> Add selectable WGS84 MGRS grids with zone-aware clipping and zone/square edge
> labels on the map and in rotated single/multi-page PDFs. Add a mobile-friendly
> centre crosshair readout with copy actions for MGRS at 1 m/10 m, UTM and lat/lon.
> Persist the system in localStorage and URLs while retaining existing UTM links.
>
> Validation: production build, 138 tests, lint with no errors, GeographicLib
> reference coordinates, and Playwright at 390/1440 px with actual PDF downloads.
> See docs/mgrs/REPORT.md and screenshots. No deploy performed.

## Deploy, when Mads chooses

The repository contains `Dockerfile` and `docker-compose.yml`. Existing project
notes describe Dokploy hosting for `kort.mahoje.dk` and `kort.solaris.dk` from the
same codebase. The Dockerfile builds Next.js standalone on Node 22 Alpine;
Compose service `kort` exposes port 3000. `NEXT_PUBLIC_BRAND` is a **build argument**
(default `mahoje`, `solaris` for the other brand). No database migration or new
secret/configuration is required.

1. Transfer/push the branch, run the complete fresh-context review on the PC and
   merge into the deployment branch after the required checks.
2. In Dokploy, open the application/Compose stack serving **kort.mahoje.dk**.
   Confirm its configured Git source and deployment branch contain this change.
   If automatic deployment is enabled, merging may already trigger deployment;
   otherwise press **Deploy**. Keep the existing domain, environment and brand
   build argument. The exact current Dokploy app ID/source configuration was not
   accessible from this worker and has not been guessed.
3. Confirm the new container runs and the live site serves the new
   **Koordinatsystem → MGRS** option. Check
   `/?c=55.67610,12.56830,12.0&g=1&cs=mgrs&gs=1000` and repeat with
   `c=55.10100,14.70600,12.0` for Bornholm. Copy coordinates and download a PDF.
   A successful build alone is not live verification.
4. Deploy Solaris separately only if wanted, preserving `NEXT_PUBLIC_BRAND=solaris`.
   No deploy of either brand was triggered in this task.

Rollback: redeploy the previous known-good Dokploy image/commit. There are no
schema or stored-data migrations to undo; the new localStorage key is additive.
