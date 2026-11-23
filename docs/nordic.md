# Norway and Sweden

The map picks its source from the centre of the view (`src/lib/geo/regions.ts`,
coarse country outlines from Natural Earth in `regionPolygons.ts`, built with
`scripts/build-region-polygons.mjs`). If the centre is in Denmark, or closest to
Denmark, nothing changes. In Norway or Sweden the Danish base maps are replaced
by a Nordic topographic map: OpenTopoMap at the bottom and Kartverket on top,
because Kartverket's tiles are transparent outside Norway. That gives a seamless
map across the border. OpenStreetMap and "Intet basiskort" (no base map) stay as
the user chose them. A multi-page print uses one source for every sheet.

| | Screen | PDF | Licence and credit |
| --- | --- | --- | --- |
| Norway | Kartverket WMTS cache `cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator` | Kartverket WMS `wms.geonorge.no/skwms1/wms.topo` with `MAP_RESOLUTION` = the paper's dpi, only Kartverket's own layers (`kd_*`, no FKB) | CC BY 4.0, "© Kartverket" |
| Sweden | OpenTopoMap `tile.opentopomap.org` (up to zoom 17) | same tiles | CC-BY-SA, "Kortdata: © OpenStreetMap-bidragydere \| Højdedata: SRTM, Sonny \| Kortdesign: © OpenTopoMap" |
| Contours, Norway | Kartverket WMS (`kd_hoydekurver,fkb_hoydekurver`) | `kd_hoydekurver` with `MAP_RESOLUTION` | CC BY 4.0 |
| Place names, Norway | `api.kartverket.no/stedsnavn/v1/navn` (only when searching) | - | CC BY 4.0 |

**Why WMS in the PDF?** The MapServer behind Kartverket's WMS picks data and
symbol size from the scale. With `MAP_RESOLUTION=300` it uses the paper's
resolution, so a 1:25,000 print gets the N50 map's 20 m contours and readable
text, instead of the dense 5 m FKB contours a 256 px tile would trigger. The PDF
only requests the sources the area can show: no Kartverket calls for a print in
Sweden, no OpenTopoMap calls in the middle of Norway.

**No Geovekst data in the PDF.** Kartverket's
[terms](https://www.kartverket.no/api-og-data/vilkar-for-bruk) say that the WMS
and cache show Geovekst data (FKB) at detailed levels, which may be displayed
but not copied without permission from the rights holders. A PDF is a copy, so
the PDF does not request `topo` but Kartverket's own layers (N50 to N5000,
`kd_*`, plus hillshade and depths), and never a WMS scale below 1:12,000, where
only FKB is drawn. A 1:5,000 or 1:10,000 print in Norway therefore gets the N50
map enlarged, not the detailed FKB data the screen shows.

**Credits.** On screen MapLibre shows each source's own credit plus a link to
`/kilder`. In the PDF the footer says "Kortdata: Kartverket" and/or "Kortdata:
OpenTopoMap/OpenStreetMap", and the licence lines are in the box at the top left
of the map. Which sources a print credits is decided from the area (Kartverket up
to 25 km from Norway at sea, 3 km over Swedish land).

**Grid and declination.** Outside Denmark the grid always follows the GPS zones
(32, 33, 34 and 35, also MGRS), whatever "32 – hele Danmark" says. If a print is
in zone 33 and covers Swedish land, the footer says "(= SWEREF 99 TM)", because
SWEREF 99 TM uses the same projection as UTM 33. Declination is computed with
WMM2025 for the centre of the area, so it is valid in Norway and Sweden too.

**Contours only.** Choose "Intet basiskort" and enable "Højdekurver Norge
(Kartverket)". There is no free contour service for Sweden; use OpenTopoMap,
which has contours built in.

## Limitations

- **No Lantmäteriet maps for Sweden.** The only free web map, *Topografisk
  webbkarta Visning, översiktlig* (CC0, needs a free API token from Geotorget),
  stops at zoom 14 (about 10 m per pixel), is too coarse for 1:25,000 prints and
  closes on 31 December 2026
  ([Lantmäteriet, 20 May 2026](https://www.lantmateriet.se/sv/geodata/vara-produkter/Produktnyheter/Geografisk-information/avveckling-av-produkten-topografisk-webbkarta-visning-oversiktlig/)).
  The detailed *Topografisk webbkarta Visning, cache* is paid. So no token proxy
  has been built, and no token needs to be created. A possible route
  is *Topografisk webbkarta Nedladdning, raster* (free under the high-value
  datasets terms), served as PMTiles from `tiles.mahoje.dk` like the Danish
  contours. But from 6 October 2026 it is only available through a STAC API,
  access is ordered separately in [Geotorget](https://geotorget.lantmateriet.se),
  and new terms of use must be accepted, because Lantmäteriet now treats parts of
  the content as personal data
  ([Lantmäteriet, 28 Sep 2026](https://www.lantmateriet.se/sv/geodata/vara-produkter/Produktnyheter/Geografisk-information/nytt-tillhandahallande-av-topografisk-webbkarta-nedladdning-raster/)).
  Until those terms are checked (public tiles, printing, GDPR), it is not built.
- **OpenTopoMap** runs on a small server and asks not to be used for bulk
  downloads. Its tiles are never stored offline, and a large multi-page print
  fetches many tiles. Kartverket's tiles are not stored offline either: zoom
  12-20 contain Geovekst data, which may be displayed but not copied without
  permission.
- **The Danish layers** (Skærmkort styles, orthophoto, DHM contours, cadastre,
  Danske Stednavne) have no data outside Denmark. Orthophoto is not free for
  Norway (Norge i bilder requires an agreement) or Sweden (Ortofoto Visning is paid).
- **Search in Sweden:** Lantmäteriet's place names need an account and token,
  and Nominatim does not allow search-as-you-type. Swedish places are found by
  panning the map.
- On screen the credit shows both Kartverket and OpenTopoMap outside Denmark,
  even where only one is visible. The PDF credits precisely.
