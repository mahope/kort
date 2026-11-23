#!/bin/bash
# Build vector contours from KDS's own DHMHoejdekurver file product and log time, RAM and size.
#   build-contours-dafo.sh <gpkg> <layer> <tag> <minzoom> <outdir> [x0 y0 x1 y1]
# e.g. formkurve0_5 (0.5 m, `contours`) z12-14 and formkurve2_5 (2.5 m, `contours25`) z11-14.
# The gpkg is one municipality or the national total download (GetFile, gpkg in a zip).
# Steps: clip (EPSG:25832 box, optional) -> GeoJSONSeq in EPSG:4326 with h = hoejde -> tippecanoe
# with the flags of scripts/contours/kurver-dk.sh. Runs in the repo's contour image (kort-kurver).
set -euo pipefail
GPKG=$1 LAYER=$2 TAG=$3 Z0=$4 OUT=$5; shift 5
mkdir -p "$OUT"
DIR=$(cd "$(dirname "$GPKG")" && pwd) FILE=$(basename "$GPKG")
m() { # m <cmd...>: run in the container, print "<seconds> s <MB> MB <cpu> cpu-s"
  docker run --rm -u "$(id -u):$(id -g)" -v "$DIR:/in:ro" -v "$OUT:/out" kort-kurver bash -c '
    s=$(date +%s.%N); "$@" >/dev/null || exit $?; e=$(date +%s.%N)
    cpu=$(awk "/^usage_usec/{printf \"%.1f\", \$2/1e6}" /sys/fs/cgroup/cpu.stat)
    echo "$(awk "BEGIN{printf \"%.1f\", $e-$s}") s $(( $(cat /sys/fs/cgroup/memory.peak) / 1048576 )) MB $cpu cpu-s"' _ "$@"
}
log() { echo "$*" | tee -a "$OUT/build-log.txt"; }
CLIP=(); [ $# -eq 4 ] && CLIP=(-spat "$@" -clipsrc spat_extent)
rm -f "$OUT/$TAG".{geojsons,pmtiles}
log "== $TAG from $FILE:$LAYER ${*:-all}, $(date -u +%FT%TZ)"
S1=$(m ogr2ogr -f GeoJSONSeq -t_srs EPSG:4326 -lco RS=NO -dim XY "${CLIP[@]}" \
  -sql "SELECT geometri, hoejde AS h, hjaelpekurve AS hj FROM $LAYER" "/out/$TAG.geojsons" "/in/$FILE")
S2=$(m tippecanoe -q -o "/out/$TAG.pmtiles" -l kurver -Z"$Z0" -z14 --force \
  --simplification=4 --no-feature-limit --no-tile-size-limit "/out/$TAG.geojsons")
log "$TAG: geojson $S1 | tippecanoe $S2 | $(wc -l < "$OUT/$TAG.geojsons") lines | $(stat -c %s "$OUT/$TAG.pmtiles") B"
