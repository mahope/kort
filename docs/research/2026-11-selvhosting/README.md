# Self-hosting Kort's map layers (issue #39, option 4)

Research and a measured experiment, 23 November 2026. Nothing in the app was changed. The
experiment was a 10 x 10 km sample over Silkeborg. It was fetched from the Dataforsyningen
services that Kort uses today, with the app's public token: 107 large GetMap/GetCoverage requests
for the sample, plus about 300 ordinary tile requests for the live comparisons. No raw data or
tiles were uploaded anywhere, and `tiles.mahoje.dk` was only read with `curl -I` and one range
request.

This builds on [`docs/research/2026-11-datafordeleren-migration.md`][mig] (merged in PR #91)
and the PMTiles PoC in PR #60 (`docs/poc-pmtiles/RAPPORT.md`,
`docs/research/2026-11-05-dtk25-pmtiles.md`). It does not repeat them.

## Dansk opsummering

- **Det kan lade sig gøre, og det er billigt.** DTK25, Høje og Lave Målebordsblade, et selvbygget
  skyggekort og stednavne fylder tilsammen ca. **27 GB** for hele Danmark (spænd 13-35 GB). Det er
  WebP q85 til zoom 16, målt på et 10 x 10 km-udsnit og ganget op med PoC'ens flisetal. På
  Cloudflare R2 koster det **ca. 2 kr. om måneden**. På den nginx, der allerede kører
  `tiles.mahoje.dk`, koster det 0 kr. ekstra, hvis serveren har plads.
- **Printet bliver næsten lige så skarpt som i dag.** I 1:25.000 ved 300 dpi henter MapLibre
  **z15-fliser, ikke z16**. Med de rigtige indstillinger (lanczos-nedskalering, q85) er vores fliser
  lige så læsbare som WMS'ens PNG. Tynde højdekurver er en anelse blødere. Billederne ligger i
  mappen. I 1:10.000 er vores z16 med overzoom lige så skarp som WMS'ens z17.
- **WMS'en har ingen skalaafhængig rendering, som vi mister.** DTK25-tjenesten nedskalerer det
  samme rasterkort på alle zoomniveauer. Vi taber kun det, tjenesten tilbyder ud over kortet: andre
  årgange (`dtk25_2002`-`2023`, ortofoto 2024-2026) og stednavnelagets flade-omrids.
- **Hvad vi vinder:** uafhængighed af Datafordeleren ved runtime, ingen nøgle i browseren, cache
  headers (WMS'en sender ingen), og fliser der er 5-6 gange mindre i PDF'en end PNG fra WMS'en.
  Derudover bliver offline (#36) mulig, men det kræver ny kode, fordi service workeren i dag ikke
  kan gemme PMTiles.
- **Byggetid:** 16-23 sekunder pr. 100 km² pr. lag på en maskine med 4 vCPU og 8 GB, og højst ca.
  1 GB RAM pr. trin. Det giver ca. **2-3 timer pr. lag for hele landet**, og agent-worker (16 GB) er
  rigelig. Download af rådata kræver Datafordeler-nøglen. Dem har vi ikke kunnet måle størrelsen på.
- **Ortofoto og matrikel skal ikke selv-hostes nu.** Ortofoto er 40-150 GB, kommer kun som ECW
  (GDAL kan ikke læse ECW uden et proprietært SDK) og skal genbygges hvert år. Matriklen opdateres
  hver nat. Skærmkortet findes ikke som vektorfiler, kun som raster-GeoTIFF.
- **Fund om `tiles.mahoje.dk`:** Cloudflare cacher **ikke** `.pmtiles` i dag (`cf-cache-status:
  DYNAMIC`), så hvert range-kald rammer nginx. `scripts/contours/README.md` siger det modsatte og er
  rettet i denne gren.
- **Anbefaling, i rækkefølge:**
  1. stednavne som vektor, bygget af det snapshot vi allerede har (10,6 MB, 5 sekunders bygning,
     ingen nøgle),
  2. Høje og Lave Målebordsblade,
  3. skyggekort fra DHM, som en udvidelse af kurve-scriptet,
  4. DTK25.

  Alle fire lægges på `tiles.mahoje.dk` med versionerede filnavne. Det koster ca. 5-7
  agent-arbejdsdage og 0-3 kr. om måneden. Beslutningerne står nederst (S1-S6).

## Contents

1. [Method and what was measured](#1-method-and-what-was-measured)
2. [Raw data, updates and licence per layer](#2-raw-data-updates-and-licence-per-layer)
3. [Experiment: build, size and print sharpness](#3-experiment-build-size-and-print-sharpness)
4. [Pipeline per layer and the whole country](#4-pipeline-per-layer-and-the-whole-country)
5. [Storage, traffic and price](#5-storage-traffic-and-price)
6. [Operations](#6-operations)
7. [What we lose and what we gain](#7-what-we-lose-and-what-we-gain)
8. [Recommendation](#8-recommendation)
9. [Decisions for Mads](#9-decisions-for-mads)
10. [Open points](#10-open-points)
11. [Files and how to reproduce](#11-files-and-how-to-reproduce)

## 1. Method and what was measured

Each claim below is marked **measured** (own run, numbers in `measurements/`), **documented**
(source linked) or **estimate**.

- **Machine:** a 4 vCPU / 8 GB RAM Linux box, not agent-worker. No Datafordeler key was available
  there (`~/.config/kort/datafordeler.key` does not exist on this box). So **raw file sizes
  could not be measured**, and Datafordeler's own services were not called.
- **Sample:** EPSG:25832 box 530000-540000 E, 6220000-6230000 N. That is 10 x 10 km over
  Silkeborg: town, the lakes, Silkeborgskovene and farmland. In PR #60, DTK25 JPEG tiles here
  averaged 14.1 KB at z16, the same as that PR's three-area mean (14.7 KB). So Silkeborg is a
  middle case, not a best case.
- **Stand-in for the raw files:** the WMS was asked for large GetMap images in EPSG:25832 at
  DTK25's native resolution (1.25 m/px, 508 dpi). These were 2,000 px chunks, 16 requests per layer,
  PNG, with a 0.5 s pause. This mimics the Datafordeler GeoTIFF sheets (10 x 10 km, EPSG:25832),
  so the pipeline includes the reprojection to EPSG:3857 that the real build needs. Ortofoto was
  fetched at 0.25 m over 2.5 x 2.5 km (25 requests). The terrain model came from the WCS at 1.6 m
  (16 requests). Totals are in `measurements/wms-fetch-summary.txt`.
- **Tools:**
  - GDAL 3.14.0dev (`ghcr.io/osgeo/gdal:ubuntu-small-latest`, via the repo's own
    `scripts/contours/Dockerfile`, image digest `sha256:a9c1c860…a74ecb`) and tippecanoe 2.53.0
    from Ubuntu.
  - Rendering used MapLibre 6.19.0 and pmtiles 4.5.0 from the repo's `node_modules`, in headless
    Google Chrome against `127.0.0.1` only.
  - No new packages were installed.
- **RAM** is the container's cgroup `memory.peak`. It includes page cache, so it is an upper bound.

## 2. Raw data, updates and licence per layer

Sources were looked up on 23 Nov 2026. Format details come from Datafordeler's
[transition guide for file downloads][dafo-trans] and its [file-download meeting deck of
18 Sep 2024][dafo-tema]. Raster downloads are "GeoTIFF og ECW". GeoTIFF is "reorganiseret … til
10x10 km GeoTIFF-tiles, der er tilpasset Det Danske Kvadratnet". ECW is passed on as delivered.
Every file download needs a Datafordeler API key (`GetRasterMultipleFiles`,
`GetRasterMultipleSize`). No general STAC catalogue was found; the only STAC API at
[docs.dataforsyningen.dk][df-docs] is for oblique photos.

| Layer | Raw source (legal bulk route) | Format | Update rhythm | Licence and credit |
| --- | --- | --- | --- | --- |
| DTK25 | Datafordeler raster file download, dataset `DTK25` | GeoTIFF 10 x 10 km sheets, EPSG:25832, 508 dpi (≈1.25 m) | **Frozen:** "Data er historiske og opdateres dermed ikke", last 2023 (documented in PR #60) | CC BY 4.0, credit Klimadatastyrelsen ([terms][dafo-kds]) |
| Ortofoto forår | File download `GeoDKO12,5cm` / `GeoDKO10cm` | **ECW only** (documented: "GeoDanmark Ortofoto: ECW") | Yearly. The WMS lists `geodanmark_2024`, `2025` and `2026` layers (measured, capabilities) | CC BY 4.0, Klimadatastyrelsen |
| Høje Målebordsblade (1842-1899) | File download `DTKHøjeMaalebordsblade`; Datafordeler lists "filudtræk" for historic maps ([page][dafo-hist]) | GeoTIFF | Historic, never changes | CC BY 4.0, Klimadatastyrelsen ("Historiske kort og data" is on the terms page) |
| Lave Målebordsblade (1901-1971) | File download `DTKLaveMaalebordsblade` | GeoTIFF | Historic, never changes | As above |
| Danske Stednavne | Entity file download (JSON, GeoPackage, GML); weekly full dump on Mondays | Points, lines and polygons with names | **Frozen since Sept 2025:** "Danske Stednavne bliver fra september 2025 ikke længere opdateret" ([page][dafo-sted]) | CC BY 4.0, Klimadatastyrelsen. Kort already ships a point snapshot (`data/stednavne.tsv.gz`) |
| DHM terrain and hillshade | File download DHM `Terraen` (GeoTIFF 0.4 m, ≈250 GB nationwide per a 2015 spec, **not confirmed** for today) and **`TerraenSkygge`** (ready-made hillshade); also the Datafordeler `dhm_wcs` (key) | GeoTIFF, LAZ | Rarely (new model every few years) | CC BY 4.0, Klimadatastyrelsen |
| Matriklen (MAT2) | Entity file download | JSON, GeoPackage, GML | Full dump every Sunday, deltas every night | CC BY 4.0, credit **Geodatastyrelsen** (see [mig]) |
| Skærmkortet | Raster file download only: "klassiske udgave … 13 målestoksintervaller" and one national GeoTIFF ([page][dafo-skaerm]). No vector file product. GeoDanmark Vektor (GeoPackage, weekly) is the raw vector data | GeoTIFF; vector only as raw GeoDanmark | "Flere gange årligt" (PR #60) | CC BY 4.0, Klimadatastyrelsen |

**Republishing as public tiles.** Datafordeler's terms page for KDS data says "CC BY 4.0 licens
gælder for frie geografiske data" and "Du skal kreditere Klimadatastyrelsen på et passende sted"
([terms][dafo-kds]). It lists DHM, DTK, Danske Stednavne, GeoDanmark Ortofoto, Historiske kort og
data and Skærmkortet. CC BY 4.0 allows sharing adapted material, but section 3(a)(1)(B) requires
saying that it was modified. Reprojection, resampling and recompression are modifications. So the
credit in `dataSources.ts`, `/kilder` and the PDF footer should add a short note such as
"tilpasset af kort.mahoje.dk (omprojiceret og opdelt i fliser)". The PMTiles metadata should carry
the same attribution. I am not a lawyer. One more point: Datafordeler marks the Danske Stednavne
file download as needing a key, but the licence page still lists it under CC BY.

## 3. Experiment: build, size and print sharpness

### 3.1 Pipeline used

`scripts/build-raster.sh` runs these steps:

1. Chunks with world files go into a VRT (EPSG:25832).
2. `gdalwarp -t_srs EPSG:3857 -r lanczos -tap` at the max zoom's resolution.
3. `gdal_translate -of MBTiles -co TILE_FORMAT=… -co QUALITY=…` writes the max zoom.
4. `gdaladdo -r average|lanczos` with the same format and quality as open options builds the lower
   zooms.
5. `gdal raster convert` turns the MBTiles into PMTiles.

Stednavne used `scripts/stednavne-geojson.mjs`, then tippecanoe (z6-14, one point per primary name,
minzoom from the name's size). The own hillshade was `gdaldem hillshade -multidirectional -z 1.5`
on the 1.6 m terrain, run through the same raster pipeline.

Two things went wrong on the way and are worth knowing for the real build:

- `ZOOM_LEVEL_STRATEGY=UPPER` silently made z17 out of a z16-resolution input (3.6 times more
  tiles). Use `AUTO`.
- `gdaladdo` on MBTiles ignores the creation quality unless `-oo QUALITY=` is passed. The first
  run wrote q85 at z16 but q75 below it.

### 3.2 Build time, RAM and size (measured, 100 km²)

| Layer, variant | Warp | Max zoom | Overviews | Peak RAM | PMTiles | z15 KB/tile | z16 KB/tile |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DTK25 JPEG q75 | 10.6 s | 3.0 s | 2.3 s | 0.6 GB | 18.7 MB | 16.8 | 14.1 |
| DTK25 JPEG q85 | (shared) | 2.9 s | 2.3 s | 0.6 GB | 24.1 MB | 21.7 | 18.2 |
| DTK25 JPEG q90 | | 3.2 s | 2.4 s | 0.6 GB | 29.1 MB | 26.2 | 22.0 |
| DTK25 WebP q75 | | 7.3 s | 5.6 s | 0.6 GB | 14.6 MB | 14.0 | 10.6 |
| DTK25 WebP q85 | | 7.9 s | 5.8 s | 0.6 GB | 19.4 MB | 18.6 | 14.1 |
| DTK25 WebP q85, lanczos overviews | 9.9 s | 6.2 s | 6.7 s | 0.6 GB | 19.8 MB | 19.8 | 14.1 |
| DTK25 PNG8 | | 16.2 s | 7.5 s | 0.6 GB | 40.5 MB | 37.5 | 27.7 |
| DTK25 PNG (lossless) | | 6.4 s | 4.1 s | 0.65 GB | 88.3 MB | 80.3 | 64.6 |
| Høje Målebordsblade JPEG / WebP q85 | 11.0 s | 3.2 / 7.6 s | 2.3 / 5.5 s | 0.8 GB | 25.2 / 21.2 MB | 23.9 / 21.2 | 18.4 / 15.0 |
| Lave Målebordsblade JPEG / WebP q85 | 9.9 s | 6.0 / 8.4 s | 2.6 / 6.0 s | 0.8 GB | 24.1 / 20.0 MB | | 17.6 / 14.1 |
| Own hillshade (gdaldem 1.3 s, 0.26 GB) WebP q80 | 4.1 s | 4.7 s | 3.9 s | 0.4 GB | 7.3 MB | 6.9 | 5.4 |
| KDS WMS hillshade, re-tiled, WebP q80 | 10.0 s | 5.2 s | 3.8 s | 0.6 GB | 8.2 MB | 6.1 | 6.7 |
| Ortofoto z10-18, 6.25 km², JPEG q80 / q90 / WebP q80 | 12.6 s | 2.9 / 2.7 / 6.5 s | 1.9 / 2.1 / 4.8 s | 0.94 GB | 17.1 / 24.9 / 13.4 MB | z18: 13.2 / 19.3 / 10.1 | |
| Danske Stednavne, **all of Denmark**, vector z6-14 | | | 4.8 s total | 0.03 GB | **10.6 MB** | | |

The ortofoto WMTS Kort uses today serves 20.2 KB at z18 and 23.2 KB at z17 (25 and 16 live tiles,
`measurements/ortofoto-wmts-live-tile-sizes.txt`). That matches our JPEG q90, so KDS encodes at
roughly q90. PMTiles overhead was under 0.1 % (PMTiles vs MBTiles sizes in the build logs).

### 3.3 Print sharpness: how the PDF really fetches tiles

`src/lib/pdf/renderer.ts` draws the PDF with a hidden MapLibre map at the paper's pixel size and
`pixelRatio: 1`. The render rig (`scripts/render/`) does the same with the same MapLibre version
and logs which tile zoom it loads (`measurements/render-summary-*.json`):

| Print | Ground m/px | MapLibre zoom | Tiles loaded |
| --- | --- | --- | --- |
| 1:10.000, 300 dpi | 0.85 | 15.65 | **z17** (z16 overzoomed when the archive stops at 16) |
| 1:25.000, 300 dpi | 2.12 | 14.33 | **z15** |
| 1:50.000, 300 dpi | 4.23 | 13.33 | **z14** |

MapLibre rounds raster zooms, so **the common print (1:25.000 at 300 dpi) uses z15, not z16.**
Earlier notes assumed z16 (PR #60 and [mig] section 5). This matters in two ways:

- The quality of the **overviews** (z15 and below) decides print sharpness at 1:25.000, so their
  resampling and quality setting matter more than z16's.
- z16 is still needed, but for 1:10.000-1:15.000 prints and for screen zoom.

**Images** (all 945 x 709 px frames at 300 dpi; crops shown):

- `dtk25-print-25k-300dpi.webp`: WMS PNG (today), own lossless PNG, own JPEG q85 and own WebP q75 at
  1:25.000. At normal size they are hard to tell apart.
- `dtk25-print-25k-300dpi-zoom2x.webp` and `dtk25-print-25k-300dpi-lanczos-zoom2x.webp`: the same
  at 2x with nearest-neighbour scaling, to see the pixels. With `average` overviews the faint brown
  contour lines get softer. WebP q75 loses some of them. With **lanczos overviews** the lines come
  back close to the WMS, but stay a touch softer. Our input was itself a WMS rendering at 1.25 m;
  the real 508 dpi GeoTIFF may be sharper, and that needs checking on the real file.
- `dtk25-print-10k-300dpi.webp`: WMS z17 against our z16 overzoomed. Equal. The WMS's z17 is
  upscaled from the same 1.25 m raster, so tiles above z16 add nothing.
- `dtk25-screen-50k.webp`: on-screen 1:50.000 (z13), identical. A 1:200.000 view (z11) also showed
  plain downsampled DTK25 from the WMS, with no switch to a smaller-scale map. So there is **no
  scale-dependent rendering in DTK25 to lose.**
- `ortofoto-print-10k-300dpi.webp`: WMTS against own JPEG q80, JPEG q90 and WebP q80 at 1:10.000
  (z17). All four are practically the same.
- `hillshade-25k-300dpi.webp`: KDS's hillshade WMS against our own `gdaldem` build. Ours has more
  contrast. This is styling, set by `-z`, `-alt` and `-multidirectional`.
- `stednavne-25k-300dpi.webp`: WMS against our own vector labels. **The WMS also draws outlines of
  named areas** (lakes, woods). The snapshot has only points, so the vector version shows labels
  only, but as crisp text at any dpi.
- `hoeje-25k-300dpi.webp`: own JPEG against own WebP q85. In the comparison render the live
  Høje WMS did not finish its 16 tiles within 3 minutes. A single tile answered in 0.27 s with
  `curl`, so this was probably a slow moment, but it is one more sign the service is fragile.

**Pixel metrics.** `measurements/quality-25k.txt` has SSIM and PSNR against our own lossless PNG.
Against our PNG, JPEG q85 has SSIM 0.920 and WebP q85 0.941. So WebP q85 is both smaller and closer
than JPEG q85. Against the WMS PNG every variant scores low (SSIM 0.76-0.83), including our
lossless PNG. The pipelines resample differently by a sub-pixel, so that comparison measures
alignment, not quality. Judge it from the images.

**Format choice:** WebP q85 with lanczos overviews for DTK25 and the historic maps. WebP q80 for
hillshade. JPEG q90 if ortofoto is ever built. MapLibre decodes WebP in every browser Kort
supports. The PDF embeds the rendered canvas, not the tiles, so the tile format does not reach
jsPDF.

## 4. Pipeline per layer and the whole country

Sizes multiply the measured mean per zoom by PR #60's count of land-touching tiles
(`measurements/dk-tilecounts-from-pr60.json`; z18 = 4 x z17, estimate). The range is x0.47-x1.3, the
farmland-to-town spread PR #60 measured. That spread is borrowed for ortofoto and the historic
maps, so treat their ranges as rough. Full table: `measurements/extrapolation.md`.

| Layer | Tool and steps | Zooms | Format | Size, Denmark (estimate) | Build, Denmark (estimate) |
| --- | --- | --- | --- | --- | --- |
| DTK25 | Datafordeler GeoTIFF sheets → `gdalbuildvrt` → `gdalwarp` 3857 lanczos → MBTiles z16 → `gdaladdo -r lanczos` → PMTiles | 6-16 | WebP q85 | **7.8 GB** (3.7-10.2); JPEG q85 9.5 GB; PNG 35 GB | ~2.5 h compute (23 s/100 km² x 399) |
| Høje Målebordsblade | same | 6-16 (z6-15 saves ~70 %) | WebP q85 | **8.4 GB** (3.9-10.9); z6-15 JPEG 3.2 GB | ~2.5 h |
| Lave Målebordsblade | same | 6-16 | WebP q85 | **7.9 GB** (3.7-10.3) | ~2.5 h |
| Hillshade | Extend `scripts/contours/kurver-dk.sh`: per 5 km cell, terrain at 1.6 m from the Datafordeler `dhm_wcs` (key), `gdaldem hillshade`, then the raster pipeline. Or download `TerraenSkygge` ready-made | 6-16 (z6-15: 0.9 GB) | WebP q80 | **2.9 GB** (1.4-3.8) | ~1.5-2 h compute; ~2,000 land cells, ~40 MB each from the WCS |
| Danske Stednavne | Already done: `data/stednavne.tsv.gz` → GeoJSONSeq → tippecanoe. For area outlines: the GeoPackage download, then tippecanoe | 6-14 (overzoom) | MVT | **10.6 MB measured**; with geometries not measured | 5 s measured |
| Ortofoto | ECW → GeoTIFF needs an ECW-capable GDAL (proprietary SDK, not in OSGeo images) | 6-17 / 6-18 | JPEG q90 | **40 GB** to z17 (19-52); **153 GB** to z18 (72-199); WebP q80 z18: 82 GB | z17 ~8 h, z18 ~33 h compute, plus downloading ~0.5 TB of ECW (estimate) |
| Matriklen | Not recommended (daily). Would be GeoPackage → tippecanoe vector | | | not measured | |
| Skærmkort | Raster: national GeoTIFF → same raster pipeline. Vector: GeoDanmark → planetiler with an own profile, which is a cartography project | | | not measured | |

**Build time and RAM for Denmark (estimate).** These are this sample's times x 399, the ratio of
Danish z16 land tiles (370,946) to the sample's 930. Each step peaked under 1 GB because GDAL
streams by block (`-wm 1024`). A full run of the four recommended layers is about **9-10 hours of
compute on a 4 vCPU box**, sequentially. On agent-worker (16 GB) or a Hetzner CX43 (8 vCPU, 16 GB,
€16.49/month, which Hetzner showed as "currently unavailable" on 23 Nov), it takes the same or less.
RAM is not the limit; disk is:

- the intermediate 3857 GeoTIFF is ~20 GB for DTK25,
- plus the MBTiles and PMTiles,
- plus the raw sheets (not measured; 10 x 10 km at 1.25 m is about 550 sheets),

so plan **~50-60 GB of scratch per layer**. The step from 100 km² to Denmark has not been run.
Long single VRTs are known to be slower per km² than small ones. The safe way is per-sheet MBTiles,
merged at the end, or `gdal raster tile` with threads.

**Tool versions** (documented, 23 Nov):

- GDAL's latest release is 3.13.3 (18 Aug 2026). Its raster **PMTiles writer is new in 3.14**,
  which is not released, and this test used a 3.14 dev build. For production, either pin 3.14 when
  it ships or write MBTiles with GDAL 3.13 and convert with go-pmtiles v1.31.2 (`pmtiles
  convert`).
- tippecanoe 2.79.0 is the latest (Ubuntu ships 2.53.0, which worked).
- planetiler is v0.10.2.
- rio-pmtiles 1.2.2 is a Python alternative to the GDAL steps. It was not needed.

## 5. Storage, traffic and price

### 5.1 What `tiles.mahoje.dk` is today

Measured 23 Nov with `curl -I` and one `Range: bytes=0-16383` request:

- **Setup.** It is a Dokploy app (`kort-tiles`) with `nginx:1.29-alpine` and bind mounts on the
  main node (`scripts/contours/README.md`). It serves one file, `kurver-5m.pmtiles` (109,941,855 B,
  `Last-Modified: 12 Nov 2026`, `ETag`, `Accept-Ranges: bytes`, CORS for `Range`,
  `Cache-Control: public, max-age=86400`). The range request answered `206`.
- **Not cached.** Cloudflare proxies the host, but the answer carries **`cf-cache-status:
  DYNAMIC`**: Cloudflare does not cache it. Cloudflare only caches listed file extensions, and
  `.pmtiles` is not one of them ([Cloudflare default cache behaviour][cf-cache]), so a Cache Rule
  would be needed. Every tile range goes to nginx on the main node.
  - The contours README said "Cloudflare caches the file for a day". That was wrong and is
    corrected on this branch.
  - Even with a Cache Rule, files over **512 MB** are never cached on Free, Pro or Business (PR #60).
- **Terms risk.** Cloudflare's service-specific terms still let it limit the Free/Pro/Business CDN
  when it is used "to serve video or a disproportionate percentage of pictures, audio files, or
  other large files" ([terms][cf-terms]). Tens of GB of map images through the proxied CDN fit that
  wording. Contents hosted in R2 are, as far as I know, not covered by this clause, but I have
  **not confirmed** that.

### 5.2 Traffic per month (estimate)

These are the same usage scenarios as [mig] section 3, recalculated for self-hosted WebP tiles.

- **Screen session:** 150-300 tiles of ~14-20 KB, so 2-6 MB.
- **PDF, A4 at 1:25.000 and 300 dpi:** about 96-120 z15 tiles at 19.8 KB, so **~2-2.4 MB**. The
  WMS PNG today is about 121 KB per tile, so ~12-15 MB.

| Scenario | Screen sessions | PDFs | Traffic | Range requests |
| --- | --- | --- | --- | --- |
| Low | 1,000 | 200 | ~2.5-6.5 GB | ~0.2-0.4 M |
| High | 10,000 | 3,000 | ~26-67 GB | ~1.8-4 M |

Offline areas come on top: 2,000 tiles is ~30-40 MB, and the 20,000 maximum is ~300-400 MB.
PMTiles adds 1-3 directory reads per session, which is negligible.

### 5.3 Price per month, in DKK, excl. VAT

Exchange rates on 23 Nov 2026 (ECB reference via frankfurter.dev): 1 EUR = 7.4746 DKK, 1 USD =
6.833 DKK.

| Option | Price, as published | Recommended set (~27 GB, up to 35 GB) | + ortofoto z17 (~67 GB) | + ortofoto z18 (~180 GB) | Traffic and requests | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Existing nginx on `tiles.mahoje.dk`** (Hetzner main node) | Only disk; Hetzner cloud servers include 20 TB/month ([Hetzner cloud][hz-cloud]) | **0 kr.** if the disk has ~40 GB free (not checked) | 0 kr. if ~80 GB free | needs a volume (price not looked up) | High scenario is <1 % of 20 TB | No new vendor. Origin load goes on the main node. Cloudflare terms risk (5.1). Without a Cache Rule there is no CDN cache. |
| **Cloudflare R2** | $0.015/GB-month, 10 GB free; Class B $0.36/M, 10 M free; egress free ([R2 pricing][r2]) | **~1.7-2.6 kr.** | ~5.8 kr. | ~17.4 kr. | High scenario (4 M reads) is inside the free 10 M; 30 M reads would add ~49 kr. | New service on Mahope's Cloudflare account. Custom domain, e.g. `tiles.mahoje.dk` moved to R2. No 512 MB issue for serving, since egress is free uncached. |
| **Hetzner Object Storage** | €6.49/month incl. 1 TB storage and 1 TB egress ([Hetzner][hz-os]); extra egress ~€1/TB (price wording garbled on the page) | **48.5 kr.** | 48.5 kr. | 48.5 kr. | All scenarios inside 1 TB | New service. S3-compatible, so CORS is set via the S3 API. Fixed price no matter the size. |
| Hetzner Storage Box | BX11 €3.20 (23.9 kr.) for 1 TB ([Hetzner][hz-sb]) | | | | | **Not an origin:** SFTP, SMB and WebDAV, no public HTTP with range and CORS (documented as access protocols only). Useful only as a backup of the raw files. |

Build compute costs nothing extra on agent-worker. A dedicated Hetzner CX43 (16 GB) would be
~123 kr./month, and is only worth it if agent-worker's disk cannot hold ~60 GB of scratch.

## 6. Operations

**Update rhythm per layer:**

| Layer | Rebuild |
| --- | --- |
| DTK25, Høje and Lave Målebordsblade, Danske Stednavne | Never (frozen or historic), build once |
| Hillshade | When KDS publishes a new DHM (years apart); check once a year |
| Ortofoto | Every year, if self-hosted |
| Matriklen | Every night. This is the main reason not to self-host it |

**Rollout without downtime:**

- **Versioned, immutable files.** Use names like `dtk25-2023.v1.pmtiles`, `hoeje.v1.pmtiles` and
  `hillshade-dhm2023.v1.pmtiles`, and serve them with
  `Cache-Control: public, max-age=31536000, immutable`. A new build gets a new name, is uploaded
  next to the old one (`.ny` then `mv`, as the contours README does), and is checked with
  `pmtiles show` and a few test tiles.
- **Then the app points to it.** One constant per layer in `src/lib/map/sources.ts`, or an env
  variable like `NEXT_PUBLIC_CONTOURS_URL`. The switch to the new file is a normal deploy, and a
  rollback is a revert.
- **Keep old files at least 30 days.** Open tabs, in-flight PDFs and saved offline areas still
  point to them.
- **Never overwrite a file in place.** The pmtiles client sends the archive's ETag and refetches the
  header if it changes. But a CDN can mix cached ranges of the old and new file, and that is the
  case versioned names avoid.

**Cache invalidation:**

- With versioned names, nothing needs purging.
- On nginx behind Cloudflare, add a Cache Rule for `tiles.mahoje.dk/*.pmtiles` only if the files
  are split under 512 MB. Otherwise leave it as today (DYNAMIC), because the origin bandwidth is
  free.
- On R2, the custom domain's cache follows the same rule. Uncached reads cost one Class B operation
  each.

**Monitoring:**

- **Kuma: one HTTP monitor per file.** Send `Range: bytes=0-6` and expect `206`, so one monitor
  covers file presence, range support and CORS, rather than only checking `/health`, which says
  nothing about the files.
- **Grafana.** `ssh obs apps` already has Traefik numbers per Dokploy app, so `kort-tiles` 5xx
  and latency come for free if it stays on Dokploy.
- **App.** `trackFailedTiles` in the PDF renderer already reports failed tiles, and
  `scripts/check-pdf-failures.mjs` would need the new host in its tile regex.
- **Smoke test** (CI or cron). A small `scripts/tiles/check.mjs` reads each archive's header and
  fetches one known tile per layer.

**App changes the switch needs (not done here):**

- raster `pmtiles://` sources in `sources.ts`. The render rig shows MapLibre 6 + pmtiles 4.5
  handle raster archives without extra code. The protocol is already registered in
  `src/lib/map/contours.ts`.
- the CSP stays the same (`tiles.mahoje.dk` is already allowed).
- `dataSources.ts`, `NOTICE.md` and the PDF credit, including the "tilpasset" note.
- **Offline (#36):** the service worker caches tiles by URL, and the PMTiles contours are not
  offline-capable today. Self-hosted layers would drop out of "Gem område" until offline reads
  ranges or stores decoded tiles. PR #60 section 5 has a design. This is the biggest code cost of
  self-hosting.

## 7. What we lose and what we gain

**Lose:**

- **Scale-dependent rendering: nothing for DTK25.** Measured at 1:200.000, 1:50.000, 1:25.000
  and 1:10.000. The WMS resamples one raster. A small loss of crispness in thin lines at z15 depends
  on resampling and can be tuned (section 3.3). The historic maps are scans, so the same holds.
- **Area outlines in the place-name layer.** The WMS draws them; the snapshot has no geometry.
  Getting them back needs the GeoPackage download.
- **Other years.** The WMS offers DTK25 for 2002-2023 and ortofoto for 2024-2026. A self-hosted
  set has one version unless we build more.
- **Freshness.** None for the frozen layers. For ortofoto, a year's lag unless rebuilt each
  spring. For the cadastre, a day.
- **Someone else's operations.** We own uptime, storage and rebuilds. For the frozen layers that
  is a one-off build and a Kuma monitor.

**Gain:**

- **Independence.** The 26 Nov closure shows the risk: every `_DAF` layer Kort uses goes dark with
  three days' notice. Self-hosted layers need no Datafordeler key at runtime, no proxy route, no key
  rotation every two years and no exposure to undocumented rate limits.
- **Speed.** These numbers are indicative only, because PMTiles came from localhost and WMS from
  the internet. Rendering a 16-tile print frame took 0.4-0.9 s from PMTiles against 0.9-3.7 s from
  WMS (`render-summary-*.json`). The WMS GetMap chunks took 0.8 s (DTK25) to 6.5 s (hillshade) each.
  Versioned PMTiles carry long cache headers; the WMS sends none (#26).
- **Smaller PDFs.** Each 1:25.000 page downloads ~5-6x less: ~2 MB instead of ~12-15 MB.
- **Offline becomes possible** on our own terms, without hammering KDS (#36). This needs the
  offline work in section 6.

## 8. Recommendation

Self-host the layers that **never change**, in this order. Keep ortofoto and the cadastre live
through Datafordeleren or Dataforsyningen (the proxy chosen on 23 Nov). Keep Skærmkort until it
returns in Q1 2027.

| Step | What | Why first | Agent time | Mads | Storage | Money/month |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Danske Stednavne as vector labels** from the existing snapshot | No key and no download; measured 10.6 MB and 5 s; sharper text in the PDF | 0.5-1 day (style, source, credit, PDF check) | Choose S3 | 11 MB | 0 kr. |
| 2 | **Høje + Lave Målebordsblade** | Historic, the biggest WMS tiles (~190 KB PNG), a slow service (3.5 s per sample chunk, one live render that never finished) | 1-2 days (pipeline from this folder, raster PMTiles source, credit) + ~5 h compute | Datafordeler key (already step 1 in [mig]) | ~16 GB (WebP z16) or ~6 GB (z15) | 0-1 kr. |
| 3 | **Hillshade** from DHM | Reuses the contour build and its WCS loop | 1 day + ~2 h compute | | ~3 GB | 0 kr. |
| 4 | **DTK25** | The most-used layer, frozen since 2023; removes the proxy's heaviest traffic | 1 day + ~2.5 h compute | | ~8 GB | 0-2 kr. |
| 5 | **Offline for PMTiles layers** (#36) | Without it, steps 1-4 drop out of "Gem område" | 2-3 days | | | |
| later | Ortofoto, if the yearly rebuild and ECW decoding are worth it | | 3-5 days + ~0.5 TB download | ECW decision | 40-150 GB | 0-17 kr. on R2, 0 kr. on nginx if the disk allows |

**Total for steps 1-4:** about 4-6 agent days, plus 2-3 for offline. Storage is ~27 GB, at 0 kr.
on today's nginx or ~2 kr./month on R2. The step-2 pipeline gets its gate on the first real
GeoTIFF sheet: check sharpness, size per sheet and time. Only then build the country.

## 9. Decisions for Mads

**S1. Which layers to self-host?**
- (a) The frozen ones: stednavne, Høje/Lave Målebordsblade, hillshade, DTK25. *Recommended.*
- (b) Only stednavne and the historic maps for now; DTK25 stays behind the proxy.
- (c) (a) plus ortofoto (40-150 GB, yearly rebuild, ECW).
- (d) None; stay on the Datafordeler proxy.

**S2. Where do the files live?**
- (a) Today's nginx on `tiles.mahoje.dk`, if the main node has ~40 GB free; versioned files, no CDN
  cache. *Recommended:* 0 kr., already set up, no new vendor.
- (b) Cloudflare R2 behind `tiles.mahoje.dk` (~2 kr./month, new service on Mahope's account).
  Best if traffic grows or the Cloudflare terms worry you.
- (c) Hetzner Object Storage (48.5 kr./month flat).

**S3. Place names:**
- (a) Point labels from the snapshot now (no outlines). *Recommended.*
- (b) Download the GeoPackage and also draw the area outlines (needs the key; size not measured).
- (c) Keep the WMS (gone from 26 Nov) or the proxy.

**S4. Zoom depth for the historic maps:**
- (a) z6-16 (~8 GB each, sharp at 1:10.000). *Recommended* if the GeoTIFF's native resolution is
  ≤ 1.3 m.
- (b) z6-15 (~3 GB each). Enough for 1:25.000 prints, softer at 1:10.000.

**S5. Tile format:**
- (a) WebP q85 with lanczos overviews (smallest at equal or better quality). *Recommended.*
- (b) JPEG q85-q90 (~20-40 % larger, faster to build).
- (c) Lossless PNG for DTK25 (~35 GB, identical to the source).

**S6. Offline (#36):**
- (a) Build PMTiles support into "Gem område" right after step 4. *Recommended.*
- (b) Accept that self-hosted layers cannot be saved offline for now.

## 10. Open points

1. **Raw file sizes and native resolution** for DTK25 and the two Målebordsblade series. Call
   `GetRasterMultipleSize` with the key, then build one real sheet. This is the gate before step 2.
2. **Free disk on the main node** (`hetzner-main`) for S2 (a). `obs servere` showed 52 % used on
   23 Nov, but the size was not checked.
3. Whether **R2 content served through a custom domain** is outside the Cloudflare CDN clause in
   5.1. Not confirmed.
4. Whether the **GDAL 3.14 PMTiles writer** ships before the build, or we use go-pmtiles for the
   last step.
5. The **step from 100 km² to Denmark** (time, disk, one VRT against per-sheet builds) has not
   been run.
6. The **`TerraenSkygge` file product** against our own `gdaldem` build: style and size.
7. **ECW decoding** for ortofoto: licence and availability of an ECW-capable GDAL build.
8. The Hetzner Object Storage **extra-egress price** (page wording garbled) and Hetzner volume
   prices. Neither is needed for the recommendation.

## 11. Files and how to reproduce

Data and tiles are outside git, in `~/dev/data/selvhosting/` (raw chunks 0.8 GB, builds about
1 GB). Everything in this folder can be rebuilt from scratch with the scripts below.

| Path | What |
| --- | --- |
| `scripts/fetch-wms.py` | 10 x 10 km sample as 2,000 px chunks with world files. `DF_TOKEN` = the public token in `src/lib/map/styles.ts` |
| `scripts/build-raster.sh` | Chunks → PMTiles variants with time and RAM per step (`OVR=lanczos` for lanczos overviews) |
| `scripts/stednavne-geojson.mjs` | `data/stednavne.tsv.gz` → GeoJSONSeq with tippecanoe minzooms |
| `scripts/zoomstats.py`, `scripts/extrapolate.py` | Per-zoom tile sizes, and the extrapolation to Denmark |
| `scripts/render/` | Render rig: `serve.mjs` (static + Range), `page.html` (MapLibre frame like the PDF renderer), `shoot.mjs` (headless Chrome over CDP, localhost only), `cases/` |
| `measurements/` | Build logs, zoom statistics, render summaries, quality metrics, fetch totals, extrapolation |
| `*.webp` | The comparison images listed in section 3.3 |

```sh
docker build -t kort-kurver scripts/contours
export DF_TOKEN=…   # public token, src/lib/map/styles.ts
python3 scripts/fetch-wms.py raw/dtk25 dtk_25_DAF DTK25 1.25 image/png     # until 26 Nov 2026
OVR=lanczos scripts/build-raster.sh "$PWD/raw/dtk25" "$PWD/out/dtk25" dtk25 16 8 WEBP:85 JPEG:85
python3 scripts/zoomstats.py out/dtk25/*.mbtiles > out/dtk25/zoomstats.txt
node scripts/render/shoot.mjs scripts/render/cases/cases-dtk25.json tiles/ render/
```

(Script paths are relative to this folder. The fetch step only works until the Dataforsyningen
services close on 26 Nov 2026. After that the real input is the Datafordeler file download.)

[mig]: ../2026-11-datafordeleren-migration.md
[dafo-trans]: https://datafordeler.dk/media/rijp4jxb/transitionsguide-for-fildownload-samt-etablering-og-vedligeholdelse-af-kopiregister.pdf
[dafo-tema]: https://datafordeler.dk/media/n4abehew/temamoede-om-fildownloads-inkl-beskyttede-data-og-rasterdata-2024-09-18.pdf
[df-docs]: https://docs.dataforsyningen.dk/
[dafo-kds]: https://datafordeler.dk/vejledning/brugervilkaar/kds-geografiske-data/
[dafo-hist]: https://datafordeler.dk/dataoversigt/historiske-kort-og-data/
[dafo-sted]: https://datafordeler.dk/dataoversigt/danske-stednavne/
[dafo-skaerm]: https://datafordeler.dk/dataoversigt/skaermkortet/
[cf-cache]: https://developers.cloudflare.com/cache/concepts/default-cache-behavior/
[cf-terms]: https://www.cloudflare.com/service-specific-terms-application-services/
[r2]: https://developers.cloudflare.com/r2/pricing/
[hz-os]: https://www.hetzner.com/storage/object-storage/
[hz-sb]: https://www.hetzner.com/storage/storage-box/
[hz-cloud]: https://www.hetzner.com/cloud/cost-optimized/
