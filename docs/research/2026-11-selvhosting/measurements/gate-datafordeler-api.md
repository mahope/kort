# Datafordeler file API, answers on 23 Nov 2026 (raw-data gate)

Called from agent-worker with the Datafordeler key (never printed; `scripts/dafo/dafo.py`).
Boxes are EPSG:25832. "S" = the Silkeborg box 530000,6220000-540000,6230000.
"DK" = 440000,6040000-900000,6410000.

## GetRasterMultipleSize

| register / datasetname | S | DK |
| --- | --- | --- |
| DTK / DTK25 | 0.2 GB | 5.7 GB |
| DTK / DTKLaveMaalebordsblade | 0.2 GB | 5.7 GB |
| DTK / DTKHøjeMaalebordsblade | 404 | 404 |
| DTK / DTKHøjeMaalebordsblade, version 0 and 2 | 404 | |
| DTK / DTKHoejeMaalebordsblade, DTKHojeMaalebordsblade, Foo | 400 "Dataset…" (unknown name) | |
| DTK / DTKPreussiskeMaalebordsblade | 404 | 404 for 1 km boxes in Copenhagen and Funen; 1.2 GB for 500000,6080000-540000,6120000 |
| DTK / DTK250, DTK500, DTK1000 | 0.0 GB | |
| DTK / DTK4cm19571976 | 0.1 GB | |
| dhm / Terraen | 2.7 GB (box edges pull in neighbour tiles; the 25 interior downloads were 1.86 GB) | 853.4 GB |
| dhm / Terraen2015 | 1.8 GB | |
| dhm / Overflade | 2.8 GB | |
| dhm / TerraenSkygge, OverfladeSkygge, Terraenskygge | 404 | 404 |
| DTK / DTK25, version 2 | 404 | |

DK quadrants (boxes share edges, so the sum double counts a little):

| | SW | SE | NW | NE |
| --- | --- | --- | --- | --- |
| DTK25 | 3.0 GB | 1.2 GB | 2.1 GB | 0.1 GB |
| Lave | 3.1 GB | 1.0 GB | 2.2 GB | 0.0 GB |

## Sheet counts (`scripts/dafo/count-sheets.py`, 20 km grid, interior boxes)

- DTK25: 383 cells answer 200 (`gate-sheets-dtk25.tsv`); 192 hold a land place name, 191 are sea
  only (`scripts/land-sheets.py`). One sea sheet (2023_606_84) downloaded: 1.3 MB.
- Lave: 206 cells answer 200 (`gate-sheets-lave.tsv`); 190 touch land.

## Downloads (GetRasterMultipleFiles / GetFile)

| What | Files | Bytes | Time |
| --- | --- | --- | --- |
| DTK25, box S | 2023_620_52, 620_54, 622_52, 622_54 (.tif, stored zip) | 211,083,756 | 98.5 s |
| Lave, box S | M20L_620_52, 620_54, 622_52, 622_54 | 200,775,052 (zip ~201 MB) | not logged |
| DTK25 sea sheet | 2023_606_84 | 1,312,580 | 1.8 s |
| Terraen, box S in 25 calls of 2 x 2 km | 100 x DHM_TERRAEN_1km_*.tif | 1.86 GB | 17.8-37.1 s per call (`gate-fetch-terrain.txt`) |
| DHMHoejdekurver Formkurve2_5, Silkeborg (0740), gpkg | 1 gpkg, 68 MB unzipped | 22,727,288 | 11.7 s |
| DHMHoejdekurver Formkurve0_5, Silkeborg (0740), gpkg | 1 gpkg, 1.2 GB unzipped | 456,394,899 | 175.0 s |

## GetAvailableFileDownloads Register=DHMHoejdekurver (national gpkg zips)

| Entity | National | Sum of 98 municipalities |
| --- | --- | --- |
| Formkurve0_5 | 16.18 GB | 16.43 GB |
| Formkurve2_5 | 0.76 GB | 0.78 GB |
| Kote2_5 | 0.02 GB | 0.02 GB |
| Referencekurve0_25 | 96.67 GB | 98.38 GB |

All files are generation 401, generated 28 Sep 2026 with expiry 5 Oct 2026, and still downloaded
on 23 Nov. `Register=DTK` and `Register=DHM` are unknown to this method (400).

## dhm_wcs (wcs.datafordeler.dk/DHMNedboer/dhm_wcs/1.0.0/WCS, coverage dhm_terraen)

| Chunk | Pixels | Answer |
| --- | --- | --- |
| 2.5 km at 1.6 m | 1563 | GeoTIFF, 9,781,666 B, 5.8 s and 5.0 s |
| 1.25 km at 0.8 m | 1563 | GeoTIFF, 9,781,666 B, 4.8 s |
| 2.5 km at 0.8 m | 3125 | connection reset by the server |
