# Issue #23 touch audit

Playwright Chromium against local production builds served with `next start`.
The baseline was `origin/main` at `a1d2ad4`. Each brand was built separately.
The audit emulated a coarse pointer at 360×844, 390×844 and 768×1024, and
a fine pointer at 1440×900. Search used two stubbed address results.
The advanced state included the multi-page settings. The layer state kept
those settings open and added the map layer popover.

## Results at 390×844

| Brand | Route and state | Targets <44 px | Fields <16 px | Text <12 px | axe `target-size` |
| --- | --- | ---: | ---: | ---: | ---: |
| Mahoje | `/` Start | 4 → 0 | 0 → 0 | 2 → 0 | 0 → 0 |
| Mahoje | `/` Search | 1 → 0 | 0 → 0 | 2 → 0 | 0 → 0 |
| Mahoje | `/` Advanced | 1 → 0 | 0 → 0 | 4 → 0 | 0 → 0 |
| Mahoje | `/` Layers | 1 → 0 | 0 → 0 | 4 → 0 | 0 → 0 |
| Mahoje | `/om` | 12 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| Solaris | `/` Start | 4 → 0 | 0 → 0 | 2 → 0 | 0 → 0 |
| Solaris | `/` Search | 1 → 0 | 0 → 0 | 2 → 0 | 0 → 0 |
| Solaris | `/` Advanced | 1 → 0 | 0 → 0 | 4 → 0 | 0 → 0 |
| Solaris | `/` Layers | 1 → 0 | 0 → 0 | 4 → 0 | 0 → 0 |
| Solaris | `/om` | 9 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |

Axe 4.14.0 also returned zero `target-size` findings on both brands in the
extra after-only checks for expanded attribution, grid settings and tool
panels, and the minimized sheet. Those states had zero undersized targets,
fields and text. The PDF button fit inside the viewport in the minimized
sheet. Solaris also returned `color-contrast` findings, which are outside
this issue.

The audit counts the associated label for native radios and checkboxes. It
includes rendered controls reachable by scrolling, whether they are currently
in the viewport or below the fold. The 16 px check covers fields with
text entry or visible text values. Only MapLibre's own control text, including
the scale bar and attribution, is exempt from the 12 px rule. Attribution
links still count toward the target-size check.

`npm run build` passed for both brands. `npm run lint`, `npm run typecheck`
and `npx vitest run` passed (48 files, 495 tests). At 1440×900 the desktop
target and font counts matched the baseline in every state. A pixel
comparison of the search-state sidebar interior and the About viewport
showed zero differences for both brands. Map tile loading can vary between
captures. Physical iOS Safari and its safe-area insets were outside this run.

## Screenshots

The 390 px WebP files show the five table states in order, before on top
and after below. The other files show search before on the left and after
on the right. The original #46 evidence remains in [before](before) and
[after](after).

| Brand | 360 px | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- | --- |
| Mahoje | [360](recheck/mahoje-360.webp) | [390](recheck/mahoje-390.webp) | [768](recheck/mahoje-768.webp) | [1440](recheck/mahoje-1440.webp) |
| Solaris | [360](recheck/solaris-360.webp) | [390](recheck/solaris-390.webp) | [768](recheck/solaris-768.webp) | [1440](recheck/solaris-1440.webp) |

To reproduce, start a local production build for each brand in turn. Point
`TOOLS` at a directory containing `playwright`, `@axe-core/playwright` and
axe-core 4.14.0. Use `CHECK=1` to make a 390 px regression fail the command.

```sh
NEXT_PUBLIC_BRAND=mahoje BASE=http://localhost:3123 OUT=/tmp/kort-audit CHECK=1 node scripts/audit-touch-a11y.mjs
```

## PR title

Complete touch target sizing on the map and About page

## PR body

Size the remaining touch targets to at least 44×44 px on the map and About
page. Increase small helper text to 12 px and keep text fields at 16 px or
above. Keep the layer popover scrollable above the mobile sheet and the
attribution toggle reachable when its links wrap.

Playwright and axe 4.14.0 pass at 390×844 for Mahoje and Solaris. Build,
lint, typecheck and 495 Vitest tests pass. Before and after screenshots
and measurements are in `docs/screenshots/issue-23/NOTES.md`.

Fixes #23
