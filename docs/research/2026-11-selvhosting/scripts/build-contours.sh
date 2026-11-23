#!/bin/bash
# Build contour-line variants from the terrain sample and log time, RAM and size.
#   build-contours.sh <dtmdir> <outdir>
# dtmdir holds the WCS terrain chunks (EPSG:25832 GeoTIFF, see fetch-wms.py --wcs).
# Variants, all vector (MVT in PMTiles, tippecanoe flags as scripts/contours/kurver-dk.sh):
#   k05raw: every 0.5 m on the raw 1.6 m terrain, lines over 20 m (noisy: traces every bank and ditch)
#   k05: every 0.5 m on terrain averaged to 4 m, lines over 50 m (stands in for WMS dhm_kurve_0_5_m)
#   k25: every 2.5 m on terrain averaged to 10 m                 (stands in for dhm_kurve_traditionel)
#   k5:  every 5 m on terrain averaged to 10 m, as kurver-dk.sh  (to scale against kurver-5m.pmtiles)
# Runs GDAL and tippecanoe in the repo's contour image (kort-kurver, scripts/contours/Dockerfile).
set -euo pipefail
DTM=$1 OUT=$2
mkdir -p "$OUT"
m() { # m <cmd...>: run in the container, print "<seconds> s <MB> MB"; fails if the command fails
  docker run --rm -u "$(id -u):$(id -g)" -v "$DTM:/raw:ro" -v "$OUT:/out" kort-kurver bash -c '
    s=$(date +%s.%N); "$@" >/dev/null || exit $?; e=$(date +%s.%N)
    echo "$(awk "BEGIN{printf \"%.1f\", $e-$s}") s $(( $(cat /sys/fs/cgroup/memory.peak) / 1048576 )) MB"' _ "$@"
}
log() { echo "$*" | tee -a "$OUT/build-log.txt"; }
docker run --rm -u "$(id -u):$(id -g)" -v "$DTM:/raw:ro" -v "$OUT:/out" kort-kurver bash -c \
  'cd /raw && gdalbuildvrt -q /out/dtm.vrt *.tif'
log "== contours, $(date -u +%FT%TZ)"
S=$(m gdalwarp -q -overwrite -r average -tr 10 10 /out/dtm.vrt /out/dtm10.tif); log "average to 10 m: $S"
S=$(m gdalwarp -q -overwrite -r average -tr 4 4 /out/dtm.vrt /out/dtm4.tif); log "average to 4 m: $S"

variant() { # variant <tag> <input> <interval> <min length m> <minzoom>
  local tag=$1 in=$2 i=$3 len=$4 z0=$5 S1 S2 S3
  rm -f "$OUT/$tag".{gpkg,geojsons,pmtiles}
  S1=$(m gdal_contour -q -a h -i "$i" "/out/$in" "/out/$tag.gpkg")
  S2=$(m ogr2ogr -f GeoJSONSeq -t_srs EPSG:4326 -lco RS=NO -dialect SQLITE \
    -sql "SELECT h, geom FROM contour WHERE h > 0 AND ST_Length(geom) > $len" \
    "/out/$tag.geojsons" "/out/$tag.gpkg")
  S3=$(m tippecanoe -q -o "/out/$tag.pmtiles" -l kurver -Z"$z0" -z14 --force \
    --simplification=4 --no-feature-limit --no-tile-size-limit "/out/$tag.geojsons")
  log "$tag: contour $S1 | geojson $S2 | tippecanoe $S3 | $(wc -l < "$OUT/$tag.geojsons") lines | $(stat -c %s "$OUT/$tag.pmtiles") B"
}
variant k05raw dtm.vrt 0.5 20 12
variant k05 dtm4.tif 0.5 50 12
variant k25 dtm10.tif 2.5 50 11
variant k5 dtm10.tif 5 50 11
