# Issue #23 / #24: measured state and known exceptions

`scripts/audit-touch-a11y.mjs` (Playwright + axe 4.14, 360/390/768 px) writes `after/report.json`.
Axe at 390 px: `target-size`, `select-name`, `label`, `nested-interactive` and `landmark-one-main` give 0 findings.
`region` findings remain; they belong to the drawer issue.

## Still under 44 px (files outside the scope of this job)

- `Sidebar.tsx`, `ThemeToggle.tsx`: "Avancerede indstillinger", accordion headers (24 px high), footer links, theme buttons, the master checkbox rows (20 px high).
- `GeolocationButton.tsx`: "Find min position" is 40x40. It overlapped the zoom buttons (axe `target-size`); the zoom group is now shifted left in `maplibre-touch.css` instead.
- Checkbox rows in `UtmGridSettings.tsx` (MGRS branch).

These need their own changes, so #23 is only partly resolved ("Part of #23").

## Text under 12 px (outside scope)

`PrintPreview.tsx` ("A4 stående"), `FileImport.tsx` ("GPX, KML, GeoJSON") and other `text-[10px]` in sidebar panels, plus `ThemeToggle.tsx`.
MapLibre's own scale bar and attribution text are the documented exception.

## Other notes

- `BearingSelector.tsx` was touched because its slider and number field lacked labels (`label` rule).
- The headings in `MapControls.tsx` stay `h2`: with `h3`, axe reports `heading-order` when the layer popover is open.
