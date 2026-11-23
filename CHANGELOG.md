# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/). Kort deploys continuously from
`main`; tagged releases mark milestones.

## [Unreleased]

### Added
- *Søkort*, our own depth layer: depth bands, contours and soundings as vector
  tiles from `tiles.mahoje.dk/soekort.pmtiles` (Danmarks Dybdemodel in Danish
  waters, EMODnet outside them up to 59° N, NOVANA in 80 lakes). Sharp lines
  and numbers in the PDF at any dpi instead of enlarged 50 m WMS cells. Two
  styles in the sidebar: classic (five blue tints) and shallow water (bands at
  1, 2, 3, 4 and 5 m, each with a numbered contour) for canoe, kayak and dinghy.
  On the skærmkort the bands go under the land; over raster base maps only
  contours and numbers are drawn. The URL is `NEXT_PUBLIC_SOEKORT_URL`.
- The depth layer can be saved offline with an area (one file, about 65 MB).

### Changed
- *Søkort* replaces *Havdybder Danmark*, *Havdybder Europa* and *Sødybder* in
  the menu; old links with those layers open *Søkort*. *Havdybder Europa* stays
  in the menu outside Denmark, where the new file ends at 59° N.
- The PDF credits Dybdemodellen with its download date instead of "Indeholder
  WMS-tjeneste" for the new layer, and names EMODnet and NOVANA only when the
  print holds their data.
- The Danish raster layers (DTK25, orthophoto, Høje/Lave Målebordsblade, Danske
  Stednavne, DHM contours and hillshade) now come from Datafordeleren through
  the app's own tile route `/api/tiles`, which adds the API key on the server
  and sets cache headers. Without `DATAFORDELER_API_KEY` the route serves the
  same tiles from Dataforsyningen as before (#5).
- Cadastre (Matrikelskel) moved to `wms/forvaltning2` and is credited to
  Geodatastyrelsen on the map, in the PDF and on `/kilder` (#5).
- The service worker caches and saves tiles from the tile route for offline use.
  Areas saved before are moved to the new cache keys on the first load, so they
  keep working offline. Until the move is done (or if storage is full), the
  service worker still finds their tiles under the old keys, and the areas stay
  in the list. Deleting such an area also deletes its tiles under the old keys.
- Sea layers read like a chart: Danmarks Dybdemodel draws as smooth blue depths
  (the plain depth layer, enlarged from the model's own 50 m cells instead of
  grey-black blocks), the seabed relief always lies under the depth colours,
  and sea marks are toned down and start at about 1:50,000, where OpenSeaMap's
  symbols no longer clump. Same look in the PDF.
- Shorter on-map credit with the sea layers on (two lines instead of three at
  1440 px). Dybdemodellen's required sentence, "Indeholder WMS-tjeneste", the
  terms link and "Model og data er ikke egnet til navigation" stay word for word.
- The lake depth layer says which lakes it covers (80 lakes, mostly in Jutland;
  not Furesø).

### Fixed
- Saved offline areas are only dropped from the list when none of their tiles is
  left, so a partial download no longer disappears because three sampled tiles
  were missing.
- A map tile that failed to load (a timeout or server error) stayed a grey
  square until the map moved; it is now requested again. Tiles the server
  refuses, such as the tile route's 404 outside Denmark, are not.
- A shared link without opacities (`ov=dd,hb`) showed every layer at 100 %, so
  the grey relief covered the sea; it now uses each layer's default.
- An overlay switched on later no longer draws over the ones below it in the
  list (the relief over the depths, or the depths over the wrecks).

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
