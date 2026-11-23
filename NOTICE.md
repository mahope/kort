# Notice: data, fonts and third-party software

The source code in this repository is licensed under the [MIT License](LICENSE),
© 2026 Mads Holst Jensen / Mahope.

The MIT License covers **the code only**. The map data, fonts and libraries the
app uses keep their own licences, listed below. If you run your own copy, you
must keep the credits the data licences ask for (see "What you must keep").

## Map and geodata

The full, authoritative list with the exact credit text for each layer is
`src/constants/dataSources.ts`, shown to users on the `/kilder` page. A test
(`src/constants/__tests__/dataSources.test.ts`) fails if a base map or overlay is missing from it.

| Data | Provider | Licence |
|---|---|---|
| Skærmkort vector tiles, DTK25 topographic map, orthophoto, historic maps (Høje/Lave Målebordsblade), elevation model (DHM), cadastre, Danske Stednavne, Adressevælger | [Klimadatastyrelsen](https://www.klimadatastyrelsen.dk/) via [Dataforsyningen](https://dataforsyningen.dk/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (free geodata since 16 May 2024) |
| 5 m and 10 m contours (`tiles.mahoje.dk`) | Derived by kort.mahoje.dk from Klimadatastyrelsen's DHM | CC BY 4.0 (derived work) |
| Danmarks Dybdemodel 50 m, historic lake charts | Geodatastyrelsen via Dataforsyningen | CC BY 4.0, plus Dataforsyningen's [terms for marine data](https://dataforsyningen.dk/) |
| Lake depth contours (NOVANA) | Miljøstyrelsen via Danmarks Miljøportal | Terms for Danish public data (Danmarks Miljøportal): free, may be modified and used commercially |
| Bathymetry and wrecks outside Denmark | [EMODnet](https://emodnet.ec.europa.eu/en/terms-use-emodnet-online-services-data-and-data-products) (EU); wreck data from UK Hydrographic Office | CC BY 4.0; UKHO data under Open Government Licence v3.0 |
| Sea marks | [OpenSeaMap](https://openseamap.org/) and OpenStreetMap contributors | Tiles CC BY-SA 2.0, data ODbL |
| OpenStreetMap base map | [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright) | ODbL |
| Norway: topographic map, contours, place names (SSR) | [Kartverket](https://www.kartverket.no/api-og-data/vilkar-for-bruk) | CC BY 4.0 |
| Sweden: OpenTopoMap | [OpenTopoMap](https://opentopomap.org/about), OSM contributors, SRTM and [Sonny](https://sonny.4lima.de/) | CC-BY-SA |
| Magnetic declination (WMM2025) | NOAA/NCEI and British Geological Survey | Public domain (US government work) |
| Country outlines for region detection | Natural Earth | Public domain |

The snapshots committed to this repo (`data/stednavne.tsv.gz`,
`data/wmm/WMM2025.COF`, `public/data/soekort/`) are redistributed under the
licences above.

**Not for navigation.** The sea and lake layers are not nautical charts. The app
says so on the map, in the PDF and on every lake chart page. Keep that warning.

### What you must keep

If you deploy your own copy:

1. Keep the on-map attribution (MapLibre's attribution control and the link to
   `/kilder`) and the credit line in the PDF footer
   (`kdsPrintCredit` / `nordicPrintCredit` in `src/lib/map/sources.ts`).
2. Keep the `/kilder` page, or another page that lists the same sources and licences.
3. Use your own Dataforsyningen token (see `.env.example`) instead of ours, and
   follow [Dataforsyningen's terms](https://dataforsyningen.dk/).
4. Respect the tile usage policies of OpenStreetMap, OpenTopoMap and Kartverket:
   no bulk downloads, no offline caching of OpenTopoMap or Kartverket tiles
   (the offline feature already skips them), and no Geovekst/FKB data in PDFs
   for Norway.

## Fonts

Both fonts are bundled in `src/fonts/` and are licensed under the
[SIL Open Font License 1.1](https://openfontlicense.org/). The licence texts are in
`src/fonts/og/`.

- **Brygada 1918**, © 2020 The Brygada 1918 Project Authors
- **Schibsted Grotesk**, © 2023 The Schibsted Grotesk Project Authors

Map labels use the glyphs served by Dataforsyningen (`cdn.dataforsyningen.dk`).

## Icons and images

The interface icons are inline SVGs written for this project and are covered by
the MIT License. The Solaris logo in `public/brand/solaris/` belongs to the scout
group Solaris. It is **not** covered by the MIT
License; remove it (or set `NEXT_PUBLIC_BRAND=mahoje`) in your own deployment.

## Runtime libraries

| Library | Licence |
|---|---|
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | BSD-3-Clause |
| [PMTiles](https://github.com/protomaps/PMTiles) | BSD-3-Clause |
| [@tmcw/togeojson](https://github.com/placemark/togeojson) | BSD-2-Clause |
| [Next.js](https://nextjs.org/), [React](https://react.dev/), [react-map-gl](https://visgl.github.io/react-map-gl/), [jsPDF](https://github.com/parallax/jsPDF), [Zustand](https://github.com/pmndrs/zustand), [Terra Draw](https://github.com/JamesLMilner/terra-draw), [mgrs](https://github.com/proj4js/mgrs), [@plausible-analytics/tracker](https://github.com/plausible/plausible-tracker) | MIT |

Run `npx license-checker --production --summary` for the full transitive list.
