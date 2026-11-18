# Vector sea chart ("Søkort" base map)

The base map "Søkort" is our own vector chart of Danish waters: depth bands, depth
contours and soundings on the water, land, built-up areas, forest, lakes and streams on
land, coastline with a beach edge, Natura 2000, wrecks, marinas, anchorages and
fairways. Everything is one PMTiles file on `tiles.mahoje.dk`, drawn by
`src/lib/map/soekort/style.ts` with the colour and size tokens in
`src/lib/map/soekort/soekort-style.json`.

## Build

On agent-worker or any host with Docker (~15 GB free disk, 7 GB RAM is enough; about
15 minutes, most of it downloads and tippecanoe):

```sh
bash scripts/soekort-vektor/build-soekort-tiles.sh ~/dev/soekort-vektor
# -> ~/dev/soekort-vektor/soekort.pmtiles (about 170 MB), last line SOEKORT-FAERDIG
```

Each step writes its output once and is skipped on the next run, so a failed run is
resumed by running the script again. To redo a step, delete its output (for example
`layers/tal.geojsons` for the soundings, or `dl/` to fetch fresh data). The image
`kort-soekort` (GDAL, tippecanoe, osmium) is built from the `Dockerfile` here.

| Step | Source | Output |
| --- | --- | --- |
| Depths | EMODnet Bathymetry DTM (`emodnet:mean`, WCS, 1/16 arc minute, CC BY 4.0), 1 x 1 degree tiles for 7-16 E, 54-58 N | `work/elev.tif`: 50 m grid in EPSG:3035, cubic spline from the 115 m cells so band edges are soft |
| Land | OSM land polygons and coastlines (osmdata.openstreetmap.de, ODbL) | `layers/land`, `layers/kyst`, `work/land.tif` (land burnt into the 50 m grid) |
| Coast fix, soundings | `bathy.py` | water by OSM that the model calls land gets -0.5 m, so the 0-1 m band meets the drawn coast; soundings in tiers from 6.4 km (zoom 9) to 400 m (zoom 13): a shoal if the block hides one, else a deep hole, else the depth nearest the block's median, at least 100 m off the coast. Rounded down to tenths; `t` is the label with the tenths as a subscript ("17₄"), whole metres from 21 m |
| Bands and contours | `gdal_contour` | bands 0-1, 1-2, 2-3, 3-5, 5-10, 10-20, 20-50 m (`dybde`, attribute `d` = shallow edge); lines at 1, 2, 3, 5, 10, 20, 30, 50 m (`kurve`) |
| Land use, names, harbours | Geofabrik's Denmark extract (ODbL), `osmium tags-filter` + `osm_layers.py` | `by`, `skov`, `natur`, `vand`, `vandloeb`, `sted`, `oe`, `vandnavn`, `havn` (marinas and `seamark:type=anchorage`), `rende` (`seamark:type=fairway/recommended_track/navigation_line`) |
| Natura 2000 | Miljøportalen WFS `dai:habitat_omr` and `dai:fugle_bes_omr` (frie data, no key) | `natura`: one dashed boundary around the union; `naturanavn`: one label per area |
| Wrecks, lake depths | `public/data/soekort/vrag.geojson` and `soedybder.geojson` (round 2) | `vrag`, `soe` |
| Tiles | tippecanoe, zoom 5-14, joined with `tile-join` | `soekort.pmtiles` |

The style reads exactly the tippecanoe layer names (`-L name:`) in the build script; a
test (`src/lib/map/soekort/__tests__/style.test.ts`) fails if they drift apart, or if
the depth bands in the script and the colour tokens differ.

### Danmarks Dybdemodel (DDM50)

Geodatastyrelsen's terms for DDM50 (May 2024, sagsnr. 340-3058) grant a worldwide, free,
non-exclusive and otherwise unlimited right to copy, distribute, publish, combine with
other data and use the data commercially, so derived tiles are allowed. The credit must
then say "Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning", the
date the data was fetched, and "Model og data er ikke egnet til navigation", and the
terms must be linked.

The GeoTIFF is only downloadable with a Dataforsyningen login (dataforsyningen.dk/data/4817),
so the published file uses EMODnet's DTM, which in Danish waters is built from Geodatastyrelsen's
surveys but is coarser (about 115 m). With the file at hand:

```sh
DDM_TIF=/path/to/ddm_50m.tif bash scripts/soekort-vektor/build-soekort-tiles.sh
```

lays DDM50 over EMODnet. This path has not been run yet: check the file's sign first
(`DDM_CALC`, default `-A`, must turn it into elevation, negative below sea level), and add
the DDM credit with the download date to `SOEKORT_ATTRIBUTION` and `SOEKORT_CREDITS` in
`style.ts` and to the `soekort` entry in `src/constants/dataSources.ts`.

## Publish

Same pattern as the contours (`scripts/contours/README.md`): a new file name, copied next
to the others and moved into place, so readers never see a half-written file.

```sh
scp ~/dev/soekort-vektor/soekort.pmtiles hetzner-main:/opt/kort-tiles/html/soekort-v1.pmtiles.ny
ssh hetzner-main 'mv /opt/kort-tiles/html/soekort-v1.pmtiles.ny /opt/kort-tiles/html/soekort-v1.pmtiles'
curl -sI -H "Range: bytes=0-99" https://tiles.mahoje.dk/soekort-v1.pmtiles   # expect 206
```

A rebuild with a changed layout gets a new name (`soekort-v2.pmtiles`) and a new default in
`SOEKORT_URL`, so a cached old app never reads a new file. The app reads the URL from
`NEXT_PUBLIC_SOEKORT_URL`; the CSP (`next.config.ts`) follows it.

## Look at it locally

Serve the file with the tiles nginx config on a free port, build against it and take the
before/after screenshots (`docs/screenshots/soekort-vektor/`):

```sh
docker run -d --name soekort-tiles-local -p 127.0.0.1::80 \
  -v ~/dev/soekort-vektor:/usr/share/nginx/html:ro \
  -v "$PWD/scripts/contours/nginx-kort-tiles.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.29-alpine
PORT=$(docker port soekort-tiles-local 80 | head -1 | cut -d: -f2)
ln -f ~/dev/soekort-vektor/soekort.pmtiles ~/dev/soekort-vektor/soekort-v1.pmtiles
NEXT_PUBLIC_SOEKORT_URL=http://127.0.0.1:$PORT/soekort-v1.pmtiles npm run build
KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-soekort-vektor.mjs
docker rm -f soekort-tiles-local
```

## Licences in the file

The PMTiles file holds OpenStreetMap data and is published under ODbL as far as that
data goes (the file itself is the database); depths are EMODnet (CC BY 4.0), Natura 2000
and lake depths are Danish public data under Miljøportalen's terms, wrecks are EMODnet
(CC BY 4.0) with UKHO data (OGL v3.0). The credits on the map, in the PDF and on `/kilder`
name all of them.
