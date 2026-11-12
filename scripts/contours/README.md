# 5 and 10 m contour lines

Dataforsyningen has contour WMS layers at 0.25, 0.5 and 2.5 m, but nothing coarser. For
1:25.000-1:50.000 prints we build our own 5 m contours from Klimadatastyrelsen's terrain
model (Danmarks Højdemodel, CC BY 4.0) and serve them as one PMTiles file. The app shows
every line for "5 m" and only `h % 10 == 0` for "10 m" (`src/lib/map/contours.ts`).

## Build

On agent-worker (Docker, ~15 GB free disk):

```sh
docker build -t kort-kurver scripts/contours
bash scripts/contours/kurver-dk.sh ~/dev/kurver/dk 6   # resumable; ~1-2 h for all of Denmark
```

Per 5 x 5 km cell (EPSG:25832) the script:
1. probes the terrain WCS at 100 m and skips the cell if the highest point is 0 m or below (sea). A probe that is not a readable GeoTIFF (the WCS answers errors with HTTP 200 and XML) is logged as a failure instead, except "InvalidBoundingBox" (outside the model), which counts as sea,
2. fetches the terrain at 5 m with a 20 m buffer and averages it to 10 m, so 5 m lines do not trace every ditch and road bank,
3. runs `gdal_contour -i 5`, clips back to the cell, drops lines shorter than 50 m and heights of 0 m or below,
4. writes GeoJSONSeq; all cells are joined by `tippecanoe` into `kurver-5m.pmtiles` (zoom 11-14, layer `kurver`, attribute `h` in metres).

Failed cells are listed in `<workdir>/logs/fejl.log`; rerun the script to retry them (finished cells have a `.done` marker).

## Hosting

`tiles.mahoje.dk` is a Dokploy application (`kort-tiles`, project kort, main node): `nginx:1.29-alpine` with two bind mounts from the host:

- `/opt/kort-tiles/html` -> `/usr/share/nginx/html` (the `.pmtiles` file)
- `/opt/kort-tiles/default.conf` -> `/etc/nginx/conf.d/default.conf` (`nginx-kort-tiles.conf`: CORS for range requests, `/health`)

DNS is the `*.mahoje.dk` wildcard (Cloudflare, proxied) to the main node.

To publish a new file, copy it next to the old one and swap it in with `mv`, so readers never see a half-written file:

```sh
scp kurver-5m.pmtiles hetzner-main:/opt/kort-tiles/html/kurver-5m.pmtiles.ny
ssh hetzner-main 'mv /opt/kort-tiles/html/kurver-5m.pmtiles.ny /opt/kort-tiles/html/kurver-5m.pmtiles'
```

Cloudflare caches the file for a day (`Cache-Control: max-age=86400`); purge it there if a new build must show at once.

The app reads the URL from `NEXT_PUBLIC_CONTOURS_URL` (default `https://tiles.mahoje.dk/kurver-5m.pmtiles`).

Failed cells are listed in `logs/fejl.log` (this run only) and get no `.done` marker. If any cell failed, the script stops with `KURVER-FEJL` before building the PMTiles file; run it again, and only the failed cells are fetched.
