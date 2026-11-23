# Self-hosting Kort's map layers (issue #39, option 4)

Research and a measured experiment, 23 November 2026. Nothing in the app was changed. The
experiment was a 10 x 10 km sample over Silkeborg. It was fetched from the Dataforsyningen
services that Kort uses today, with the app's public token: 107 large GetMap/GetCoverage requests
for the sample (plus one repeat to check the script), and about 390 ordinary tile requests for the
live comparisons. No raw data or
tiles were uploaded anywhere, and `tiles.mahoje.dk` was only read with `curl -I` and one range
request.

**Raw-data gate, same evening (section 3.4).** The gate in section 10, point 1 was then run on
agent-worker with the Datafordeler key: `GetRasterMultipleSize` for every series, one real
download per series over the same Silkeborg box (DTK25, Lave Målebordsblade, the 0.4 m terrain
and both contour file products), the report's pipeline on those files, and the same print
comparison against the WMS. Sections 2-5, 8-10 carry the measured numbers. Nothing was uploaded to
`tiles.mahoje.dk`.

This builds on [`docs/research/2026-11-datafordeleren-migration.md`][mig] (merged in PR #91)
and the PMTiles PoC in PR #60 (`docs/poc-pmtiles/RAPPORT.md`,
`docs/research/2026-11-05-dtk25-pmtiles.md`). It does not repeat them.

## Dansk opsummering

**Porten (afsnit 10, punkt 1) er kørt med de rigtige filer, 23/11 om aftenen:**

| Lag | Port | Hvad de rigtige filer viste |
| --- | --- | --- |
| Stednavne | Bestået (ingen rådata nødvendige) | Bygges af vores eget snapshot, 10,6 MB |
| Lave Målebordsblade | **Bestået** | 206 ark à 20 x 20 km (190 med land), **2,0 m/px**, 5,7 GB download. Hvert ark har sin egen farvetabel og skal udvides til RGB ark for ark. 21,5 MB pr. 100 km², ca. **8,5 GB** for landet (z6-16) |
| Høje Målebordsblade | **Ikke bestået** | Datasættet kendes af API'et, men svarer **404 for hele landet**, mens Lave og Preussiske svarer. Der er ingen fil at bygge af. Beslutning S9 |
| Skyggekort | **Bestået** | Det færdige `TerraenSkygge` svarer også 404, så vi bygger selv. 0,4 m-terrænet er **853 GB** for landet (ca. 3,5 døgns download), så byggejobbet bruger Datafordelerens `dhm_wcs` ved 1,6 m (ca. 67 GB, ca. 11 timer). Ca. **2,7 GB** (z6-16) |
| Højdekurver 0,5 m og 2,5 m | **Bestået, og bedre end ventet** | Begge findes som KDS' egne filer (`Formkurve0_5`, `Formkurve2_5`, GeoPackage pr. kommune eller hele landet). 2,5 m-kurverne er **præcis WMS'ens linjer**, og vi skal ikke udglatte selv. Ca. **2,9 GB** og **0,25 GB** |
| DTK25 | **Bestået** | 383 ark à 20 x 20 km (192 med land), **1,25 m/px** som antaget, 5,7 GB download. Størrelse og skarphed er de samme som i stedfortræder-målingen: **7,8 GB** for landet |

- **Skarphed ved 300 dpi:** DTK25 og Lave er lige så skarpe som WMS'en i 1:25.000 og 1:10.000
  (billederne `gate-*.webp`). Lave bør have z16: z15 er synligt blødere i 1:10.000 (S4).
  Vores skyggekort i z16 er blødere end KDS' WMS i 1:10.000; z17 (0,8 m) er lige så skarpt, men
  koster 4,6 gange pladsen og et 0,8 m-download på ca. 270 GB (S8). 0,5 m-kurverne skal have
  maxzoom 15, ellers bliver de kantede i 1:10.000.
- **Hele landet koster:** ca. **22 GB** disk på `tiles.mahoje.dk` (spænd 12-28 GB) uden Høje,
  ca. **95 GB download** (ca. 14 timer ved de målte 2-3 MB/s) og ca. **40 CPU-timer** på
  agent-worker. Det er 3-4 gange mere CPU end rapportens skøn: agent-worker er 3-6 gange
  langsommere pr. kerne end maskinen fra eftermiddagen, og DTK25-arkene dækker også hav. Med
  parallelle ark og trådet `gdalwarp` er det ca. 1,5 døgn i alt, lag for lag. Kræver ca. 60 GB
  scratch pr. rasterlag (agent-worker har 107 GB fri på volumet, 15 GB på roden).
- **Rækkefølge og plan for byggejobbet** står i afsnit 12: stednavne, Lave Målebordsblade,
  terræn (skyggekort og begge kurvelag), DTK25. Høje venter på S9.

**Fra eftermiddagens rapport (stadig gældende):**

- **Det kan lade sig gøre, og det er billigt.** På Cloudflare R2 koster ca. 22 GB **ca. 2 kr. om
  måneden**. På den nginx, der allerede kører `tiles.mahoje.dk`, koster det 0 kr. ekstra, hvis
  serveren har plads (S2 (a) er valgt).
- **Højdekurverne (0,5 m og 2,5 m) lukker med `dhm_DAF` 26/11.** Fund: WMS'ens 0,5 m-lag tegnes
  **slet ikke** i et 1:25.000-print i dag, kun fra ca. 1:7.500. S7 (a) er valgt; minzoom i stilen
  kopierer det.
- **I 1:25.000 ved 300 dpi henter MapLibre z15-fliser, ikke z16.** Med lanczos-nedskalering og
  WebP q85 er vores fliser lige så læsbare som WMS'ens PNG. I 1:10.000 er vores z16 med overzoom
  lige så skarp som WMS'ens z17.
- **DTK25-WMS'en har ingen skalaafhængig rendering, som vi mister.** Vi taber andre årgange
  (`dtk25_2002`-`2023`, ortofoto 2024-2026) og stednavnelagets flade-omrids.
- **Hvad vi vinder:** uafhængighed af Datafordeleren ved runtime, ingen nøgle i browseren, cache
  headers, og fliser der er 5-6 gange mindre i PDF'en end PNG fra WMS'en. Offline (#36) bliver
  mulig, men kræver ny kode (S6 (a) er valgt).
- **Ortofoto og matrikel skal ikke selv-hostes nu** (ECW, 40-150 GB, årlige og daglige
  opdateringer).
- **Fund om `tiles.mahoje.dk`:** Cloudflare cacher **ikke** `.pmtiles` i dag (`cf-cache-status:
  DYNAMIC`), så hvert range-kald rammer nginx.

## Contents

1. [Method and what was measured](#1-method-and-what-was-measured)
2. [Raw data, updates and licence per layer](#2-raw-data-updates-and-licence-per-layer)
3. [Experiment: build, size and print sharpness](#3-experiment-build-size-and-print-sharpness)
   ([3.4 the raw-data gate](#34-raw-data-gate-the-real-datafordeler-files))
4. [Pipeline per layer and the whole country](#4-pipeline-per-layer-and-the-whole-country)
5. [Storage, traffic and price](#5-storage-traffic-and-price)
6. [Operations](#6-operations)
7. [What we lose and what we gain](#7-what-we-lose-and-what-we-gain)
8. [Recommendation](#8-recommendation)
9. [Decisions for Mads](#9-decisions-for-mads)
10. [Open points](#10-open-points)
11. [Files and how to reproduce](#11-files-and-how-to-reproduce)
12. [Build plan for the next job](#12-build-plan-for-the-next-job)

## 1. Method and what was measured

Each claim below is marked **measured** (own run, numbers in `measurements/`), **documented**
(source linked) or **estimate**.

- **Machine:** a 4 vCPU / 8 GB RAM Linux box, not agent-worker. No Datafordeler key was available
  there (`~/.config/kort/datafordeler.key` does not exist on this box, and agent-worker is not
  reachable from it). So **raw file sizes could not be measured**, and Datafordeler's own services
  were not called.
- **What that leaves open.** Questions 1-3 of the brief (format, size, sharpness on the real
  files) are answered only through a stand-in: WMS renderings at the GeoTIFF's documented
  resolution. The real sheets could be sharper, larger or a different resolution. This is the
  gate in front of the whole recommendation: one `GetRasterMultipleSize` call and one downloaded
  sheet per series, run on agent-worker with the key (section 10, point 1). S1 and S4 are
  conditional on it.
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
- **Raw-data gate (section 3.4), run later the same day on agent-worker** (AMD EPYC-Rome, 16 vCPU
  shared with other agent jobs, 30 GB RAM). The key was read from `~/.config/kort/datafordeler.key`
  into an environment variable and never printed or written; the scripts in `scripts/dafo/` redact
  it from every message. Calls went to `api.datafordeler.dk/FileDownloads` (`GetRasterMultipleSize`,
  `GetRasterMultipleFiles`, `GetAvailableFileDownloads`, `GetFile`) and `wcs.datafordeler.dk`
  (`dhm_wcs`, 5 probe requests). About 900 size calls (two sheet counts over a 20 km grid, 0.1 s
  pause) and 30 downloads, 2.8 GB in total. GDAL 3.14.0dev of 22 Nov 2026 (the image was
  rebuilt, digest `sha256:61c97edc…`), same tippecanoe, MapLibre and Chrome as above. Build steps
  also log the container's CPU time (`cpu-s`, cgroup `cpu.stat`).

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
| DTK25 | Datafordeler raster file download, register `DTK`, dataset `DTK25` | **Measured:** GeoTIFF **20 x 20 km** sheets (`2023_622_52.tif`), 16,000 x 16,000 px, **1.25 m**, RGB 8-bit, DEFLATE, EPSG:25832. 383 sheets, **5.7 GB** | **Frozen:** "Data er historiske og opdateres dermed ikke", last 2023 (documented in PR #60) | CC BY 4.0, credit Klimadatastyrelsen ([terms][dafo-kds]) |
| Ortofoto forår | File download `GeoDKO12,5cm` / `GeoDKO10cm` | **ECW only** (documented: "GeoDanmark Ortofoto: ECW") | Yearly. The WMS lists `geodanmark_2024`, `2025` and `2026` layers (measured, capabilities) | CC BY 4.0, Klimadatastyrelsen |
| Høje Målebordsblade (1842-1899) | File download `DTKHøjeMaalebordsblade`; Datafordeler lists "filudtræk" for historic maps ([page][dafo-hist]) | **Measured: not available.** The dataset name is known (an unknown name gives `400`), but every box answers `404`, also all of Denmark. Only the WMS remains | Historic, never changes | CC BY 4.0, Klimadatastyrelsen ("Historiske kort og data" is on the terms page) |
| Lave Målebordsblade (1901-1971) | File download `DTKLaveMaalebordsblade` | **Measured:** GeoTIFF 20 x 20 km sheets (`M20L_622_52.tif`), 10,000 x 10,000 px, **2.0 m** (254 dpi tag), **paletted** 8-bit with a different colour table per sheet, LZW, 256 px tiles. 206 sheets, **5.7 GB** | Historic, never changes | As above |
| Danske Stednavne | Entity file download (JSON, GeoPackage, GML); weekly full dump on Mondays | Points, lines and polygons with names | **Frozen since Sept 2025:** "Danske Stednavne bliver fra september 2025 ikke længere opdateret" ([page][dafo-sted]) | CC BY 4.0, Klimadatastyrelsen. Kort already ships a point snapshot (`data/stednavne.tsv.gz`) |
| DHM contours 0.5 m (`dhm_kurve_0_5_m`, overlay `contours`) | File download register **`DHMHoejdekurver`**, entity **`Formkurve0_5`** (`GetFile`), per municipality (98 files) or national; also `Referencekurve0_25` (96.7 GB) | **Measured:** GeoPackage or GML in a zip, `LINESTRINGZ`, EPSG:25832, lines cut per 1 km tile, fields `hoejde`, `hjaelpekurve`. National gpkg zip **16.2 GB**; Silkeborg municipality 456 MB, 409,674 lines | Total download every Monday; the lines change when the DHM does | CC BY 4.0, Klimadatastyrelsen |
| DHM contours 2.5 m "traditionel" (`dhm_kurve_traditionel`, overlay `contours25`) | **Found in the gate:** same register, entity **`Formkurve2_5`** (the afternoon's "no file product" was wrong). The lines are the WMS's lines (section 3.4) | **Measured:** as 0.5 m. National gpkg zip **0.76 GB**; Silkeborg 22.7 MB, 42,042 lines | With the DHM | CC BY 4.0, Klimadatastyrelsen; KDS's own lines, so no "derived" note beyond the tiling |
| DHM terrain and hillshade | File download register `dhm`, dataset `Terraen`; **`TerraenSkygge` answers `404`** for every box (measured), so there is no ready-made hillshade. The Datafordeler `dhm_wcs` (key) works at 1.6 m and 0.8 m (measured) | **Measured:** `Terraen` is 1 x 1 km GeoTIFF tiles, 2,500 x 2,500 px, **0.4 m**, Float32, DEFLATE, nodata -9999, ~19 MB each. **853.4 GB** for the Denmark box (size call); 1.86 GB per 100 km² | Rarely (new model every few years) | CC BY 4.0, Klimadatastyrelsen |
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

**Contour lines** (vector, `scripts/build-contours.sh`, `measurements/build-log-contours.txt`).
Same 100 km², from the 1.6 m WCS terrain, tippecanoe flags as `scripts/contours/kurver-dk.sh`
(`--simplification=4`, max zoom 14, overzoomed above):

| Variant | Smoothing | Contour + GeoJSON + tippecanoe | Peak RAM | Lines | PMTiles |
| --- | --- | --- | --- | --- | --- |
| 0.5 m on raw 1.6 m terrain, z12-14 | none | 10.5 + 17.0 + 22.1 s | 0.9 GB | 36,069 | 7.4 MB |
| **0.5 m** on terrain averaged to 4 m, z12-14 | 4 m mean | 2.1 + 4.2 + 6.2 s | 0.4 GB | 15,204 | **5.2 MB** |
| **2.5 m** on terrain averaged to 10 m, z11-14 | 10 m mean | 0.1 + 0.4 + 0.8 s | 0.07 GB | 2,464 | **0.95 MB** |
| 5 m on terrain averaged to 10 m, z11-14 (as `kurver-5m.pmtiles`) | 10 m mean | 0.1 + 0.2 + 0.3 s | 0.07 GB | 1,248 | 0.48 MB |

The raw 1.6 m variant traces every bank, road and ditch and is not usable as a map layer; the
4 m mean is the stand-in for KDS's 0.5 m lines ("tilpasset en detaljeringsgrad på 1:5.000").

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
- `kurver-300dpi.webp`: contours, WMS against our own vector lines (0.13 mm, the app's colour).
  Top: 0.5 m at 1:10.000. Bottom: 2.5 m at 1:25.000. The 2.5 m lines match the WMS closely in
  shape; ours are a little more angular because the smoothing is a plain 10 m mean. The 0.5 m
  lines follow the same terrain, but a 4 m grid shows as corners at 1:10.000; a real build should
  use the `formkurve05` file product or a smoother resampling. **The WMS draws nothing for 0.5 m
  at 1:25.000** (the 1:25.000 render is one flat colour, `measurements/render-summary-contours.json`):
  the layer's `ScaleHint` max is 2.99 m per pixel diagonal, so it only appears from z17 tiles,
  about 1:7.500. So in today's app "Højdekurver (0,5 m)" is blank in a 1:25.000 or 1:50.000 PDF.
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

### 3.4 Raw-data gate: the real Datafordeler files

Run on agent-worker in the evening of 23 Nov with the Datafordeler key (section 1). Same Silkeborg
box (EPSG:25832 530000-540000 E, 6220000-6230000 N), same pipeline (`build-raster.sh` with
`OVR=lanczos` and the new `CLIP` and `EXPAND` options, z6-16), same render rig and frames.

**What the file API reports** (`measurements/gate-datafordeler-api.md`, sheet lists in
`measurements/gate-sheets-*.tsv`):

| Series | Request | Unit | Resolution, format | Denmark: sheets, download | Silkeborg box |
| --- | --- | --- | --- | --- | --- |
| DTK25 | `register=DTK datasetname=DTK25 version=1` | 20 x 20 km sheet | 1.25 m, RGB, DEFLATE | **383** sheets (192 touch land, 191 are sea only, ~1.3 MB each), **5.7 GB** | 4 sheets (the box touches their edges), 211 MB in 98.5 s |
| Lave Målebordsblade | `datasetname=DTKLaveMaalebordsblade` | 20 x 20 km sheet | **2.0 m**, paletted, own colour table per sheet, LZW | **206** sheets (190 touch land), **5.7 GB** | 4 sheets, 201 MB |
| Høje Målebordsblade | `datasetname=DTKHøjeMaalebordsblade` | | | **`404` everywhere** (Silkeborg, Copenhagen, Funen, all of Denmark; also `version=0` and `2`). `DTKPreussiskeMaalebordsblade` answers in Sønderjylland (1.2 GB for a 40 x 40 km box), so the route works; Høje is simply not there | |
| Terrain 0.4 m | `register=dhm datasetname=Terraen` | 1 x 1 km tile | 0.4 m, Float32, DEFLATE | **853.4 GB** for the Denmark box | 100 tiles, 1.86 GB, 25 calls of 2 x 2 km, ~28 s each |
| Ready hillshade | `datasetname=TerraenSkygge` (and `OverfladeSkygge`) | | | **`404` everywhere** | |
| Terrain via WCS | `wcs.datafordeler.dk/DHMNedboer/dhm_wcs/1.0.0/WCS`, `apikey=` | any box | 1.6 m: 2.5 km chunk (9.8 MB) in 5-6 s; 0.8 m: 1.25 km chunk in 4.8 s (a 2.5 km chunk at 0.8 m was reset by the server) | ~67 GB at 1.6 m, ~270 GB at 0.8 m (estimate, land only) | |
| Contours 0.5 m | `GetFile` `DHMHoejdekurver_V4_Formkurve0_5_<kommune>_TotalDownload_gpkg_Current_401.zip` | municipality or national | vector, `LINESTRINGZ`, cut per 1 km tile | national **16.2 GB** zip (sum of 98 municipalities 16.4 GB) | Silkeborg (0740) 456 MB in 175 s |
| Contours 2.5 m | same, `Formkurve2_5` | | | national **0.76 GB** | Silkeborg 22.7 MB in 12 s |

`GetRasterMultipleSize` answers in GB with one decimal ("5.7 GB / 45.0 GB"; 45 GB is the cap per
call). It returns `404` both for a box with no files and for a dataset the key cannot see, and the
file listing for `DHMHoejdekurver` still shows generation 401 of 28 Sep 2026 (expiry 5 Oct), which
downloaded fine on 23 Nov. Which sheets touch land comes from the place-name snapshot
(`scripts/land-sheets.py`). Download speed was 2.1-2.8 MB/s throughout.

**Build per 100 km², real files against the stand-in** (`measurements/gate-build-log-*.txt`,
`gate-zoomstats.txt`). Times are wall clock; CPU time was the same within 10 %, so each step runs on
one core:

| Layer | Warp | Max zoom | Overviews | Peak RAM | PMTiles | z15 / z16 KB per tile | Stand-in (section 3.2) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DTK25 WebP q85, lanczos | 28.6 s | 15.6 s | 20.1 s | 0.81 GB | **19.8 MB** | 19.8 / 14.1 | 19.8 MB, 19.8 / 14.1 |
| DTK25 lossless PNG (reference) | (shared) | 16.3 s | 16.0 s | 0.66 GB | 92.8 MB | 93.3 / 64.6 | 88.3 MB |
| DTK25, a whole sheet (400 km², 3.8 x the z16 tiles) | 116.3 s | 52.3 s | 63.2 s | 2.3 GB | 58.9 MB (mostly farmland) | 15.4 / 10.9 | |
| Lave WebP q85, lanczos, z6-16 | 24.2 s | 15.9 s | 18.9 s | 0.61 GB | **21.5 MB** | 23.6 / 14.6 | 20.0 MB |
| Lave WebP q85, z6-15 | 10.7 s | 4.3 s | 5.2 s | 0.3 GB | 8.0 MB | | |
| Hillshade from the 0.4 m terrain averaged to 1.6 m, WebP q80, z6-16 | 13 s average + 2 s `gdaldem` + 26.1 s | 10.6 s | 14.7 s | 4.3 GB (averaging) | **7.0 MB** | 7.3 / 4.8 | 7.3 MB |
| Hillshade, averaged to 0.8 m, z6-17 | 25 s + 8 s + 97.6 s | 41.9 s | 64.6 s | 4.8 GB | 31.1 MB | z17: 5.6 | |
| Contours 0.5 m, `Formkurve0_5`, z12-14 | GeoJSON 29.2 s | tippecanoe 18.5 s (37 cpu-s) | | 0.4 GB | **6.9 MB**, 64,189 lines | | 5.2 MB (own, 4 m mean) |
| Contours 0.5 m, max zoom 15 / 16 | | 25 s / 24 s | | | **12.1 MB** / 20.2 MB | | |
| Contours 2.5 m, `Formkurve2_5`, z11-14 | 1.3 s | 1.0 s | | 0.2 GB | **1.0 MB**, 6,554 lines | | 0.95 MB (own, 10 m mean) |
| Contours, all of Silkeborg municipality (855 km²) | 0.5 m: 143.5 s / 2.5 m: 6.5 s | 95.5 s / 5.8 s | | 1.4 GB | 47.5 MB / 7.3 MB | | |

Three things to know for the real build:

- **Lave needs `EXPAND=rgb` per sheet.** `gdalbuildvrt` takes the first sheet's colour table for
  all of them ("different values than the first raster for some entries in the color table"), so a
  mosaic of raw sheets gets wrong colours, and lanczos on palette indices is meaningless. With the
  wrong palette the sample was 34 MB instead of 21.5 MB. `build-raster.sh` now expands each sheet
  to an RGB VRT first.
- **agent-worker is 3-6 times slower per core than the box the afternoon ran on** (the same 1.6 m
  hillshade warp took 26 s against 4.1 s, also when the machine was nearly idle). The steps are single
  threaded. `gdalwarp -wo NUM_THREADS=ALL_CPUS` cut the warp from 24.4 s to 5.7 s; tile encoding
  in `gdal_translate`/`gdaladdo` stays on one core, so the country build should run sheets in
  parallel.
- **Time scales linearly per sheet:** the whole 400 km² DTK25 sheet took 3.6 times the CPU of the
  100 km² box for 3.8 times the tiles.

**Print sharpness at 300 dpi** (`measurements/gate-render-summary.json`, SSIM in
`measurements/quality-gate.txt`):

- `gate-dtk25-25k-300dpi.webp` (and `-zoom2x`): WMS PNG, our lossless PNG and our WebP q85 from the
  real sheet at 1:25.000 (z15). **The same as the WMS.** The real 508 dpi sheet is not sharper than
  the WMS stand-in was; the faint brown contours look as before. WebP q85 against our PNG: SSIM
  0.932 (stand-in 0.941).
- `gate-dtk25-10k-300dpi.webp`: WMS z17 against our z16 overzoomed at 1:10.000. Equal (SSIM 0.948).
- `gate-lave-25k-300dpi.webp` and `gate-lave-10k-300dpi.webp`: Lave from the real 2.0 m sheet. Equal
  at 1:25.000. At 1:10.000, z16 is a touch softer than the WMS's z17 but reads the same; **z15
  overzoomed is visibly blurred**, so keep z16 (S4).
- `gate-hillshade-300dpi.webp`: KDS's hillshade WMS against ours from the real terrain. At 1:25.000
  they match (ours slightly more contrast, as before). At 1:10.000 our z16 is clearly softer.
  `gate-hillshade-10k-z17.webp` shows that a z17 build from 0.8 m terrain matches the WMS (S8).
- `gate-kurver-300dpi.webp`: `Formkurve2_5` at 1:25.000 is **line for line the WMS's 2.5 m layer**.
  `Formkurve0_5` at 1:10.000 follows the WMS's 0.5 m lines, but with tiles only to z14 they turn
  angular. `gate-kurver05-10k-maxzoom.webp`: with max zoom 15 they are smooth; z16 adds nothing,
  because MapLibre loads z15 vector tiles for a 1:10.000 print.
- Høje: no real file, so no comparison. Its WMS failed in all 3 render attempts ("Failed to fetch"
  on 3-11 of 16 tiles), and Lave's in 3 of 6; one curl request to either answered in 0.2 s.

**Verdict per layer:**

| Layer | Gate | Consequence |
| --- | --- | --- |
| Danske Stednavne | Passed (no raw data needed) | Build from the snapshot |
| Lave Målebordsblade | **Passed** | Build z6-16 with `EXPAND=rgb`, 190 land sheets |
| Høje Målebordsblade | **Not passed**: no file product reachable | Decision S9; until then the layer stays on the Datafordeler WMS through the proxy |
| Hillshade | **Passed** (own build; `TerraenSkygge` is not available) | Terrain from `dhm_wcs` at 1.6 m, not the 853 GB file download; z16 or z17 is S8 |
| Contours 0.5 m and 2.5 m | **Passed** | KDS's own `Formkurve0_5` (max zoom 15) and `Formkurve2_5` (max zoom 14). No terrain smoothing of our own |
| DTK25 | **Passed** | Build z6-16 from 192 land sheets; size as estimated |

## 4. Pipeline per layer and the whole country

Sizes multiply the measured mean per zoom by PR #60's count of land-touching tiles
(`measurements/dk-tilecounts-from-pr60.json`; z18 = 4 x z17, estimate). The range is x0.47-x1.3, the
farmland-to-town spread PR #60 measured. That spread is borrowed for ortofoto and the historic
maps, so treat their ranges as rough. Full table: `measurements/extrapolation.md`.

| Layer | Tool and steps | Zooms | Format | Size, Denmark (estimate) | Build, Denmark (estimate) |
| --- | --- | --- | --- | --- | --- |
| DTK25 | Datafordeler GeoTIFF sheets → `gdalbuildvrt` → `gdalwarp` 3857 lanczos → MBTiles z16 → `gdaladdo -r lanczos` → PMTiles | 6-16 | WebP q85 | **7.8 GB** (3.7-10.2); JPEG q85 9.5 GB; PNG 35 GB | ~2.5 h compute (23 s/100 km² x 399) |
| Høje Målebordsblade | same | 6-16 (z6-15 saves ~67 %) | WebP q85 | **8.4 GB** (3.9-10.9); z6-15 WebP 2.8 GB (1.3-3.7) | ~2.5 h |
| Lave Målebordsblade | same | 6-16 | WebP q85 | **7.9 GB** (3.7-10.3) | ~2.5 h |
| Hillshade | Extend `scripts/contours/kurver-dk.sh`: per 5 km cell, terrain at 1.6 m from the Datafordeler `dhm_wcs` (key), `gdaldem hillshade`, then the raster pipeline. Or download `TerraenSkygge` ready-made | 6-16 (z6-15: 0.9 GB) | WebP q80 | **2.9 GB** (1.4-3.8) | ~1.5-2 h compute; ~2,000 land cells, ~40 MB each from the WCS |
| Contours 0.5 m (`contours`) | Either the `DHMHoejdekurver` file download (`formkurve05`, KDS's own lines) → GeoJSONSeq → tippecanoe, or the same terrain as the hillshade, averaged to 4 m, `gdal_contour -i 0.5`, tippecanoe (`scripts/build-contours.sh`) | 12-14, overzoomed; minzoom ~15.5 in the style to copy the WMS's hiding below 1:7.500 | MVT | **~1.2 GB** (1.2-2.5, see below) | ~1.5 h compute; ~30 GB of intermediate GeoJSON |
| Contours 2.5 m (`contours25`) | Own only: terrain averaged to 10 m, `gdal_contour -i 2.5`, tippecanoe; a stronger smoothing (e.g. 20 m or a Gaussian) to come closer to "traditionel" | 11-14, overzoomed | MVT | **~0.2 GB** (0.2-0.4) | ~15 min |
| Danske Stednavne | Already done: `data/stednavne.tsv.gz` → GeoJSONSeq → tippecanoe. For area outlines: the GeoPackage download, then tippecanoe | 6-14 (overzoom) | MVT | **10.6 MB measured**; with geometries not measured | 5 s measured |
| Ortofoto | ECW → GeoTIFF needs an ECW-capable GDAL (proprietary SDK, not in OSGeo images) | 6-17 / 6-18 | JPEG q90 | **40 GB** to z17 (19-52); **153 GB** to z18 (72-199); WebP q80 z18: 82 GB | z17 ~8 h, z18 ~33 h compute, plus downloading ~0.5 TB of ECW (estimate) |
| Matriklen | Not recommended (daily). Would be GeoPackage → tippecanoe vector | | | not measured | |
| Skærmkort | Raster: national GeoTIFF → same raster pipeline. Vector: GeoDanmark → planetiler with an own profile, which is a cartography project | | | not measured | |

**Contour sizes** are not scaled by tile counts but against the real national file: the 5 m
variant is 0.48 MB on the sample and `kurver-5m.pmtiles` is 109.9 MB for Denmark (x230). The same
factor gives 1.2 GB for 0.5 m and 0.22 GB for 2.5 m. Silkeborg is hilly, and flat land gains
relatively more 0.5 m lines than 5 m lines, so the upper end of the range is doubled. Vector
contours stay sharp at any print dpi, unlike the WMS PNGs.

**Build time and RAM for Denmark (estimate).** These are this sample's times x 399, the ratio of
Danish z16 land tiles (370,946) to the sample's 930. Each step peaked under 1 GB because GDAL
streams by block (`-wm 1024`). A full run of the recommended layers is about **11-12 hours of
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

| Option | Price, as published | Recommended set (~28 GB, up to 38 GB) | + ortofoto z17 (~67 GB) | + ortofoto z18 (~180 GB) | Traffic and requests | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Existing nginx on `tiles.mahoje.dk`** (Hetzner main node) | Only disk; Hetzner cloud servers include 20 TB/month ([Hetzner cloud][hz-cloud]) | **0 kr.** if the disk has ~40 GB free (not checked) | 0 kr. if ~80 GB free | needs a volume (price not looked up) | High scenario is <1 % of 20 TB | No new vendor. Origin load goes on the main node. Cloudflare terms risk (5.1). Without a Cache Rule there is no CDN cache. |
| **Cloudflare R2** | $0.015/GB-month, 10 GB free; Class B $0.36/M, 10 M free; egress free ([R2 pricing][r2]) | **~1.9-2.9 kr.** | ~5.8 kr. | ~17.4 kr. | High scenario (4 M reads) is inside the free 10 M; 30 M reads would add ~49 kr. | New service on Mahope's Cloudflare account. Custom domain, e.g. `tiles.mahoje.dk` moved to R2. No 512 MB issue for serving, since egress is free uncached. |
| **Hetzner Object Storage** | €6.49/month incl. 1 TB storage and 1 TB egress ([Hetzner][hz-os]); extra egress ~€1/TB (price wording garbled on the page) | **48.5 kr.** | 48.5 kr. | 48.5 kr. | All scenarios inside 1 TB | New service. S3-compatible, so CORS is set via the S3 API. Fixed price no matter the size. |
| Hetzner Storage Box | BX11 €3.20 (23.9 kr.) for 1 TB ([Hetzner][hz-sb]) | | | | | **Not an origin:** SFTP, SMB and WebDAV, no public HTTP with range and CORS (documented as access protocols only). Useful only as a backup of the raw files. |

Build compute costs nothing extra on agent-worker. A dedicated Hetzner CX43 (16 GB) would be
~123 kr./month, and is only worth it if agent-worker's disk cannot hold ~60 GB of scratch.

## 6. Operations

**Update rhythm per layer:**

| Layer | Rebuild |
| --- | --- |
| DTK25, Høje and Lave Målebordsblade, Danske Stednavne | Never (frozen or historic), build once |
| Hillshade and contours 0.5 m / 2.5 m | When KDS publishes a new DHM (years apart); check once a year. The existing `kurver-5m.pmtiles` (and so `kurver5`/`kurver10`) is in the same group: `kurver-dk.sh` reads `dhm_wcs_DAF`, which closes on 26 Nov, so a rebuild needs the Datafordeler WCS or the file download |
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
- **Scale-dependent rendering in the 0.5 m contours.** This WMS layer is hidden below about
  1:7.500 (`ScaleHint`, section 3.3). A vector layer would draw it at every zoom unless the style
  sets a minzoom, so the switch must copy that on purpose, or decide that showing 0.5 m lines in a
  1:25.000 print is wanted (it is very busy, see the image). The 2.5 m layer has no such limit.
- **KDS's own contour generalisation.** The 2.5 m "traditionel" lines exist only in the WMS. Our
  derived lines are close but not the same lines (section 3.3), and the credit must say they are
  derived, as it already does for `kurver5`.
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
| 2 | **Høje + Lave Målebordsblade** | Historic, the biggest WMS tiles (~190 KB PNG), a slow service (3.5 s per sample chunk, one live render that never finished) | 1-2 days (pipeline from this folder, raster PMTiles source, credit) + ~5 h compute | Datafordeler key (already step 1 in [mig]) | ~16 GB (WebP z6-16) or ~5.5 GB (WebP z6-15) | 0-1 kr. |
| 3 | **Terrain layers from DHM:** hillshade, contours 0.5 m and 2.5 m | `dhm_DAF` closes 26 Nov, so `contours` and `contours25` break with it unless the proxy covers them. One terrain download per 5 km cell feeds all three (and a later `kurver-5m` rebuild); extends `kurver-dk.sh` | 1.5-2 days (cell loop, hillshade + two contour variants, minzoom for 0.5 m, credit) + ~4 h compute | Choose S7 | ~4.5 GB (3 GB hillshade, 1.2-2.5 GB contours) | 0 kr. |
| 4 | **DTK25** | The most-used layer, frozen since 2023; removes the proxy's heaviest traffic | 1 day + ~2.5 h compute | | ~8 GB | 0-2 kr. |
| 5 | **Offline for PMTiles layers** (#36) | Without it, steps 1-4 drop out of "Gem område" | 2-3 days | | | |
| later | Ortofoto, if the yearly rebuild and ECW decoding are worth it | | 3-5 days + ~0.5 TB download | ECW decision | 40-150 GB | 0-17 kr. on R2, 0 kr. on nginx if the disk allows |

**Total for steps 1-4:** 4-6 agent days (0.5-1 + 1-2 + 1.5-2 + 1), plus 2-3 for offline (step 5),
so 6-9 days with offline. Storage is ~28 GB, at 0 kr.
on today's nginx or ~2 kr./month on R2. The step-2 pipeline gets its gate on the first real
GeoTIFF sheet: check sharpness, size per sheet and time. Only then build the country.

## 9. Decisions for Mads

**S1. Which layers to self-host?**
- (a) The frozen ones: stednavne, Høje/Lave Målebordsblade, the DHM layers (hillshade, contours
  0.5 m and 2.5 m), DTK25. *Recommended*, once the raw-data gate (section 10, point 1) has passed.
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
- (a) z6-16 (WebP q85, ~8 GB each, sharp at 1:10.000). *Recommended* if the GeoTIFF's native resolution is
  ≤ 1.3 m.
- (b) z6-15 (WebP q85, ~2.8 GB each). Enough for 1:25.000 prints, softer at 1:10.000.

**S5. Tile format:**
- (a) WebP q85 with lanczos overviews (smallest at equal or better quality). *Recommended.*
- (b) JPEG q85-q90 (~20-40 % larger, faster to build).
- (c) Lossless PNG for DTK25 (~35 GB, identical to the source).

**S6. Offline (#36):**
- (a) Build PMTiles support into "Gem område" right after step 4. *Recommended.*
- (b) Accept that self-hosted layers cannot be saved offline for now.

**S7. The two contour overlays, `contours` (0.5 m) and `contours25` (2.5 m):**
- (a) Rebuild both as vector from DHM in step 3: 0.5 m from the `formkurve05` file product (KDS's
  own lines) with a minzoom that copies the WMS, 2.5 m derived from smoothed terrain.
  *Recommended:* ~1.5 GB, sharp in every PDF, and the terrain loop is shared with the hillshade.
- (b) Rebuild only 2.5 m, and drop 0.5 m (it is blank in every print at 1:25.000 or smaller today).
- (c) Drop both and point users to `kurver5`/`kurver10`, which already exist. No work, but the
  2.5 m interval is gone.
- (d) Keep both on the Datafordeler proxy.

## 10. Open points

1. **Raw file sizes and native resolution** for DTK25 and the two Målebordsblade series. Call
   `GetRasterMultipleSize` with the key on agent-worker, then build one real sheet per series with
   `scripts/build-raster.sh`. This is the gate before step 2 and before S1 and S4; it could not be
   run from the machine this report was made on.
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
8. The **`DHMHoejdekurver` file format** and size, and whether its `formkurve05` lines look like
   the WMS's 0.5 m layer.
9. The Hetzner Object Storage **extra-egress price** (page wording garbled) and Hetzner volume
   prices. Neither is needed for the recommendation.

## 11. Files and how to reproduce

Data and tiles are outside git, in `~/dev/data/selvhosting/` (raw chunks 0.8 GB, builds about
1 GB). The scripts below rebuild every number and image in this folder, as long as the
Dataforsyningen services answer (until 26 Nov 2026); after that the input has to come from the
Datafordeler downloads. `build-extras.sh quality` and `hillshade` were re-run on 23 Nov and gave
the same SSIM/PSNR and the same hillshade statistics, and one WCS chunk was byte-identical.

| Path | What |
| --- | --- |
| `scripts/fetch-wms.py` | 10 x 10 km sample as 2,000 px WMS chunks with world files, or (`--wcs`) the terrain as 2.5 km GeoTIFF chunks from the WCS. `DF_TOKEN` = the public token in `src/lib/map/styles.ts` |
| `scripts/build-raster.sh` | Chunks → PMTiles variants with time and RAM per step (`OVR=lanczos` for lanczos overviews); stops on the first failing GDAL step |
| `scripts/build-contours.sh` | Terrain → contour variants (0.5 m, 2.5 m, 5 m) as vector PMTiles, with time and RAM |
| `scripts/build-extras.sh` | `hillshade` (gdaldem on the terrain), `stednavne` (snapshot → tippecanoe), `quality` (SSIM and PSNR with ffmpeg) |
| `scripts/stednavne-geojson.mjs` | `data/stednavne.tsv.gz` → GeoJSONSeq with tippecanoe minzooms (called by `build-extras.sh stednavne`) |
| `scripts/zoomstats.py`, `scripts/extrapolate.py` | Per-zoom tile sizes, and the extrapolation to Denmark (`extrapolate.py <tilecounts.json> <out dir>`, reads `<out>/<layer>/zoomstats.txt`) |
| `scripts/render/` | Render rig: `serve.mjs` (static + Range), `page.html` (MapLibre frame like the PDF renderer), `shoot.mjs` (headless Chrome over CDP, localhost only), `cases/` |
| `measurements/` | Build logs, zoom statistics, render summaries, quality metrics, fetch totals, extrapolation |
| `*.webp` | The comparison images listed in section 3.3 |

Run from the repo root. `$D` is this folder, `$W` the data folder outside git:

```sh
D=docs/research/2026-11-selvhosting W=~/dev/data/selvhosting
docker build -t kort-kurver scripts/contours            # the repo's GDAL + tippecanoe image
export DF_TOKEN=…                                       # public token, src/lib/map/styles.ts
# DTK25: fetch, build both overview variants, per-zoom statistics
python3 $D/scripts/fetch-wms.py $W/raw/dtk25 dtk_25_DAF DTK25 1.25 image/png
$D/scripts/build-raster.sh $W/raw/dtk25 $W/out/dtk25 dtk25 16 8 JPEG:75 JPEG:85 JPEG:90 WEBP:75 WEBP:85 PNG8:0 PNG:0
OVR=lanczos $D/scripts/build-raster.sh $W/raw/dtk25 $W/out/dtk25-lanczos dtk25l 16 8 JPEG:85 WEBP:85
python3 $D/scripts/zoomstats.py $W/out/dtk25/*.mbtiles > $W/out/dtk25/zoomstats.txt
python3 $D/scripts/zoomstats.py $W/out/dtk25-lanczos/*.mbtiles > $W/out/dtk25-lanczos/zoomstats.txt
# Terrain: hillshade and contours
python3 $D/scripts/fetch-wms.py --wcs $W/raw/dtm dhm_wcs_DAF dhm_terraen 1563
$D/scripts/build-extras.sh hillshade $W/raw/dtm $W/raw/hillshade
$D/scripts/build-raster.sh $W/raw/hillshade $W/out/hillshade hillshade 16 8 WEBP:80 JPEG:80 PNG:0
$D/scripts/build-contours.sh $W/raw/dtm $W/out/contours
$D/scripts/build-extras.sh stednavne "$PWD" $W/out/stednavne
# Render: shoot.mjs reads archives by file name from one flat folder
mkdir -p $W/tiles && cp $W/out/*/*.pmtiles $W/tiles/
node $D/scripts/render/shoot.mjs $D/scripts/render/cases/cases-dtk25.json $W/tiles $W/render
node $D/scripts/render/shoot.mjs $D/scripts/render/cases/cases-dtk25-lanczos.json $W/tiles $W/render
node $D/scripts/render/shoot.mjs $D/scripts/render/cases/cases-contours.json $W/tiles $W/render/contours
$D/scripts/build-extras.sh quality $W/render > $D/measurements/quality-25k.txt
python3 $D/scripts/extrapolate.py $D/measurements/dk-tilecounts-from-pr60.json $W/out > $D/measurements/extrapolation.md
```

The other layers follow the DTK25 lines with the parameters in the build logs (Høje and Lave
Målebordsblade at 1.25 m, ortofoto at 0.25 m over 2.5 x 2.5 km, the KDS hillshade WMS `dhm_terraen_skyggekort` at 1.25 m).

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
