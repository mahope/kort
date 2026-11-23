# Depth tiles from Danmarks Dybdemodel (soekort.pmtiles)

Builds one PMTiles file with depth bands, depth contours and depth labels for a
nautical-chart look, from three free sources. Phase 1 of the own chart style
(`docs/research/2026-11-egen-soekortstil/README.md`); the app does not use it yet.

| Source | What | Licence |
| --- | --- | --- |
| Danmarks Dybdemodel 2024, 50 m (Geodatastyrelsen) | Danish waters | DDM50 terms (May 2024), see the research README |
| EMODnet Bathymetry DTM (1/16 arc minute) | Outside the model: Skagerrak, Swedish and German waters | CC BY 4.0 |
| NOVANA lake depth bands (Danmarks Miljøportal WFS) and `public/data/soekort/soedybder.geojson` | 80 Danish lakes | Vilkår for brug af danske offentlige data |

No key is needed. The model comes from Geodatastyrelsen's public download
weblink, the one [dataforsyningen.dk/data/4817](https://dataforsyningen.dk/data/4817)
points to ("Uden brugerregistrering"):
`https://ftp.sdfe.dk/main.html?download&weblink=b4324b6389898704fd8ec7484882dbf3`
(folder `2024`, file `ddm_50m.dybde.tiff`, 128 MB, Float32, EPSG:3034, depth
in metres below DKMSL 2022, positive down). The script checks its sha256 and
warns when a new model version appears.

## Build

```sh
scripts/soekort/ddm-pmtiles/build.sh ~/dev/soekort-ddm/work            # all steps
scripts/soekort/ddm-pmtiles/build.sh ~/dev/soekort-ddm/work t1-areas   # one step
scripts/soekort/ddm-pmtiles/build.sh ~/dev/soekort-ddm/test --bbox 4013000 3103000 4063000 3153000  # test box (EPSG:3034)
```

`build.sh` builds the Docker image (`Dockerfile`) and runs `build.py` in it.
Every step is cached in the workdir (downloads, grids, GeoJSONSeq, per-tier
PMTiles), so a rerun only does what is missing; `--force` redoes the named
steps. A workdir is tied to its `--bbox` and `--no-emodnet` (the build refuses
a mismatch; use another workdir), and every `tiles-*` step splits the vectors
anew, so it always reads what the vector steps wrote last. Independent steps
can run in parallel:

```sh
printf '%s\n' t1-areas t1-lines t1-sound t1-emod t2-areas t2-lines t2-emod t3-areas t3-lines t3-emod lakes \
  | xargs -P 6 -I{} scripts/soekort/ddm-pmtiles/build.sh ~/dev/soekort-ddm/work {}
```

Steps: `grids`, then `t1|t2|t3-areas|lines|emod`, `t1-sound`, `lakes`, then
`tiles-t1|t2|t3` and `join`. Output: `<workdir>/soekort.pmtiles`.

### Tools and versions

- Docker image `ghcr.io/osgeo/gdal:ubuntu-small-3.13.2` (GDAL 3.13.2, Python
  3, NumPy 2.3.5) plus Ubuntu 26.04 packages: tippecanoe 2.53.0, SciPy 1.16.3,
  poppler-utils 26.01 (only for the prod comparison PDFs).
- Preview and images: Node 24, the repo's `maplibre-gl` 6.19.0 and `pmtiles`
  4.5.0, an existing Playwright 1.65 (nothing is installed).

### Size and time (23 Nov 2026, agent-worker: 16 cores, 30 GB RAM)

| | |
| --- | --- |
| `soekort.pmtiles` | **64.6 MB** (zoom 5-14): t1 58.0 MB, t2 5.9 MB, t3 0.7 MB |
| Downloads | DDM 128 MB (9 s), EMODnet 98 one-degree WCS tiles (393 MB, about 2 min), NOVANA WFS (144 MB) |
| `grids` | 4 min (incl. the EMODnet download) |
| Vector steps | about 13.5 min of work in total; 6-8 min wall time with `xargs -P 6` (`t1-areas` alone takes 6-8 min) |
| `tiles-*` and `join` | 3.5 min |
| **Total** | **about 21 min sequential, 15 min with the parallel vector steps** |

Peak memory was not measured. The `grids` step holds the 16,133 x 8,399 cell
model (540 MB as Float32) and a few working copies of it.

## Method

1. **Coast fill.** The model's coastline is generalised to 1:100.000, so the
   bands are extended 1 km (20 cells) past it with GDAL `FillNodata`
   (nearest value). The app draws them under the base map's land, so the base
   map decides where the water ends. Contours are not extended: they stop where
   the model has data.
2. **Smoothing per zoom tier**, each from its own grid, with a Gaussian blur
   that ignores nodata (normalised convolution):

   | Tier | Zoom | Grid | Blur (sigma) | Contour levels (m) | Dropped below |
   | --- | --- | --- | --- | --- | --- |
   | t1 | 12-14 | 50 m, then cubic spline to 25 m | 40 m | 1, 2, 3, 4, 5, 10, 15, 20, 30, 50, 100, 200 | 3,000 m², lines 200 m |
   | t2 | 9-11 | 50 m | 90 m | 2, 5, 10, 20, 30, 50, 100, 200 | 60,000 m², lines 1 km |
   | t3 | 5-8 | 200 m block mean | 300 m | 2, 5, 10, 20, 50, 100, 200 | 1.5 km², lines 6 km |

   Zoom 12-14 covers 1:25.000 to 1:100.000 in a 300 dpi PDF (zoom 14.3 to
   12.3) and 1:10.000 to 1:50.000 on screen. Contouring a smoothed grid
   interpolates within cells, so no line follows the 50 m cell edges.
3. **Bands and contours** with GDAL `ContourGenerateEx` (polygons between the
   levels, with open ends below the first and above the last level; lines at
   the levels). Small polygons and small holes are dropped. Bands and lines
   come from the same grid, so band edges lie exactly on the lines.
4. **Labels** (`depth_labels`):
   - `k=c`: contour numbers on straight stretches (chord at least 97 % of the
     arc over the label length), every 2 km (t1), 4 km (t2) or 40 km (t3),
     with the angle `a` for `text-rotate` kept upright.
   - `k=s`: shoal soundings, local minima of the smoothed model at least 1 m
     shallower than the mean of the surroundings (finite cells only; 5,219 in
     the full build).
   - `k=g`: a sparse grid of soundings, the shallowest cell per 1 km block
     (81,473), none next to a shoal sounding.
   
   Soundings use the unsmoothed model value, truncated to 0.1 m (towards the
   shallow side, as charts do).
5. **EMODnet** where the model has no data: depth = -elevation, at 100 m (t1,
   t2) or 400 m (t3), coarser levels (5, 10, 20, 50, 100, 200 m). Slivers
   along the Danish coast (morphological opening, 2 km) and sea areas under
   300 km² (for example Lammefjord below sea level) are dropped.
6. **Lakes**: NOVANA's 0.5 m band polygons, dissolved per lake into the same
   bands, and the whole-metre lines from `public/data/soekort/soedybder.geojson`.
7. **Tiles**: one `tippecanoe` run per tier (`--detect-shared-borders`,
   `--simplification=4`, no feature or size limits, no point dropping), joined
   with `tile-join`.

### Layers

| Layer | Geometry | Attributes |
| --- | --- | --- |
| `depth_areas` | Polygon | `d0` band from (m), `d1` band to (m, absent for the deepest band), `src` = `ddm`, `emodnet` or `novana` |
| `depth_contours` | LineString | `d` depth (m), `src` |
| `depth_labels` | Point | `d` depth (m), `k` = `c`, `s` or `g`, `a` angle (degrees, only `k=c`), `src` |

`src` lets the app credit each source only where it is on the map.

## Preview and sample images

```sh
PMTILES=~/dev/soekort-ddm/work/soekort.pmtiles node scripts/soekort/ddm-pmtiles/preview/serve.mjs 7300
# http://127.0.0.1:7300/?lat=55.05&lng=10.615&scale=25000&variant=klassisk&mode=screen|a4

PMTILES=... KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/soekort/ddm-pmtiles/preview/capture.mjs
KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/soekort/ddm-pmtiles/preview/capture-prod.mjs
PMTILES=~/dev/soekort-ddm/work/soekort.pmtiles node scripts/soekort/ddm-pmtiles/preview/export-styles.mjs
```

- `serve.mjs` serves the page, MapLibre and pmtiles from `node_modules`, the
  PMTiles file (range requests) and a cached proxy for the Dataforsyningen base
  map, so the browser only talks to localhost.
- `style.mjs` has the three style variants and `withDepth()`, which puts the
  layers into the skærmkort style.
- `capture.mjs` and `capture-prod.mjs` write the WebP images for the research
  folder. `capture-prod.mjs` uses kort.mahoje.dk's own "Download PDF".
  `capture.mjs` does not save a shot when MapLibre reported an error (a
  missing tile), and exits with status 1.
- `export-styles.mjs` writes the style JSON files, with the attribution read
  from the built file (it stops if the date or the terms link is missing).

## Hosting

Like the 5 m contours (`scripts/contours/README.md`): copy the file next to
the old one on the `kort-tiles` host and swap it in with `mv`:

```sh
scp ~/dev/soekort-ddm/work/soekort.pmtiles hetzner-main:/opt/kort-tiles/html/soekort.pmtiles.ny
ssh hetzner-main 'mv /opt/kort-tiles/html/soekort.pmtiles.ny /opt/kort-tiles/html/soekort.pmtiles'
```

The URL is then `https://tiles.mahoje.dk/soekort.pmtiles` (CORS and range
requests are already set up in `scripts/contours/nginx-kort-tiles.conf`;
Cloudflare does not cache `.pmtiles` today). Uploaded on 23 Nov 2026; the
rebuild with the 4 m level replaced it the same evening, and the first file
(without 4 m) is kept on the host as `/opt/kort-tiles/soekort-uden-4m.pmtiles.bak`.

Keep the source file and its download date with the build: the DDM50 credit
must name the date the data was fetched, and data fetched under the current
terms may keep being used on them. The date and a link to the DDM50 terms
(which must be available to anyone who gets the data) are written into the
PMTiles attribution, so the hosted file carries them on its own.
