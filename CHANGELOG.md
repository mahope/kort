# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/). Kort deploys continuously from
`main`; tagged releases mark milestones.

## [Unreleased]

### Changed
- The Danish raster layers (DTK25, orthophoto, Høje/Lave Målebordsblade, Danske
  Stednavne, DHM contours and hillshade) now come from Datafordeleren through
  the app's own tile route `/api/tiles`, which adds the API key on the server
  and sets cache headers. Without `DATAFORDELER_API_KEY` the route serves the
  same tiles from Dataforsyningen as before (#5).
- Cadastre (Matrikelskel) moved to `wms/forvaltning2` and is credited to
  Geodatastyrelsen on the map, in the PDF and on `/kilder` (#5).
- The service worker caches and saves tiles from the tile route for offline use.

### Added
- A short, closable notice over Danish views during Dataforsyningen's platform
  move (26 Nov 16:00 to 30 Nov 08:00, 2026). It disappears by itself.

## [0.1.0] - 2026-11-23

First tagged release, and the day the project became open source under the MIT
License. It sums up everything built since the first version in February 2026.

### Open source
- MIT licence, `NOTICE.md` with data, font and library licences, English README
  with screenshots, contributing guide, code of conduct, security policy, issue
  and PR templates, Dependabot, typecheck and gitleaks in CI, and a discreet
  "Open source på GitHub" link in the app (#78).
- Code cleanup without behaviour changes and dependency updates (#84).

### Maps and layers
- Danish base maps from Dataforsyningen: Skærmkort in four styles, DTK25,
  orthophoto, OpenStreetMap, historic maps, and a "no base map" option for
  orienteering-style prints (#75).
- Overlays: contours from 0.5 m to 10 m with height labels (#67, #70),
  hillshade, cadastre and place names.
- Sea and lake layers: sea depths and seabed relief from Danmarks Dybdemodel
  (#67, #69, #74), sea marks, lake depth contours, wrecks and historic lake
  charts, all marked "not for navigation" (#77).
- Norway (Kartverket) and Sweden (OpenTopoMap) switch in automatically (#76).
- `/kilder` page with every data source, licence and credit (#74).

### Printing
- PDF in the browser from 1:1,000 to 1:1,000,000, A5 to A2, plus A1/A0 (#65, #71).
- Multi-page prints as floor maps with an overview page (#65).
- UTM, MGRS (#41, #42) and DKTM1-4 grids (#72), magnetic declination with
  WMM2025 (#58), print scale control line (#54).
- PDF export fails honestly on missing tiles, offline or a capped canvas (#44, #68).

### App
- Address search through Adressevælger and our own place-name API after DAWA
  closed (#1, #4).
- Share links, undo/redo, elevation profile, bookmarks and history (#3).
- Offline: installable PWA, cached tiles, and saving an area before a trip (#43, #55).
- Mobile layout with a bottom sheet, touch targets and accessible names (#45, #46, #64, #73).

### Security and performance
- Strict CSP and security headers, URL parameter validation, rate-limited
  place-name search (#48, #49).
- MapLibre 6, rotatable public tokens via build arguments, lazy-loaded jsPDF
  and terra-draw (#47, #50, #53).

[0.1.0]: https://github.com/mahope/kort/releases/tag/v0.1.0
