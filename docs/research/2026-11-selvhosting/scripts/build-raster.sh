#!/bin/bash
# Build one raster layer sample into PMTiles variants and log time, RAM and size.
#   build-raster.sh <rawdir> <outdir> <name> <maxzoom> <minzoom> <variant>...
# variant = FORMAT:QUALITY, e.g. JPEG:85 WEBP:80 PNG:0
# Runs GDAL in the repo's contour image (kort-kurver, scripts/contours/Dockerfile).
# Steps: chunks + world files (EPSG:25832) -> VRT -> warp to EPSG:3857 at the
# max zoom's resolution (lanczos) -> MBTiles (max zoom) -> overviews (average)
# -> PMTiles (OVR=lanczos switches the overview resampling). Time is wall clock; RAM is the container's cgroup memory.peak
# (includes page cache, so it is an upper bound).
set -euo pipefail
RAW=$1 OUT=$2 NAME=$3 MAXZ=$4 MINZ=$5; shift 5
mkdir -p "$OUT"
m() { # m <cmd...>: run in the GDAL container, print "<seconds> s <MB> MB"; fails if the command fails
  docker run --rm -u "$(id -u):$(id -g)" -v "$RAW:/raw:ro" -v "$OUT:/out" kort-kurver bash -c '
    s=$(date +%s.%N); "$@" >/dev/null || exit $?; e=$(date +%s.%N)
    echo "$(awk "BEGIN{printf \"%.1f\", $e-$s}") s $(( $(cat /sys/fs/cgroup/memory.peak) / 1048576 )) MB"' _ "$@"
}
log() { echo "$*" | tee -a "$OUT/build-log.txt"; }
RES=$(python3 -c "print(2*20037508.342789244/256/2**$MAXZ)")
docker run --rm -u "$(id -u):$(id -g)" -v "$RAW:/raw:ro" -v "$OUT:/out" kort-kurver bash -c \
  "cd /raw && gdalbuildvrt -q -a_srs EPSG:25832 /out/$NAME.vrt \$(ls *.png *.jpg *.tif 2>/dev/null)"
log "== $NAME z$MINZ-$MAXZ (res $RES m), $(date -u +%FT%TZ)"
# Assign before logging: a failing $(m …) inside a log argument would not stop the script.
W=$(m gdalwarp -q -overwrite -t_srs EPSG:3857 -tr $RES $RES -tap -r lanczos -wm 1024 -multi \
  -co TILED=YES -co COMPRESS=DEFLATE -co BIGTIFF=YES /out/$NAME.vrt /out/$NAME-3857.tif)
log "warp: $W"
facs=""; f=2; for ((z=MAXZ-1; z>=MINZ; z--)); do facs="$facs $f"; f=$((f*2)); done
for v in "$@"; do
  F=${v%%:*} Q=${v##*:}
  tag=$(echo "$F-q$Q" | tr 'A-Z' 'a-z')
  rm -f "$OUT/$NAME-$tag.mbtiles" "$OUT/$NAME-$tag.pmtiles"
  QOPT=(); [ "${F#PNG}" = "$F" ] && QOPT=(-co QUALITY=$Q)
  S1=$(m gdal_translate -q -of MBTiles -co TILE_FORMAT=$F "${QOPT[@]}" -co ZOOM_LEVEL_STRATEGY=AUTO \
    /out/$NAME-3857.tif /out/$NAME-$tag.mbtiles)
  S2=$(m gdaladdo -q -r ${OVR:-average} -oo TILE_FORMAT=$F "${QOPT[@]/-co/-oo}" /out/$NAME-$tag.mbtiles $facs)
  S3=$(m gdal raster convert --overwrite /out/$NAME-$tag.mbtiles /out/$NAME-$tag.pmtiles)
  log "$tag: translate $S1 | overviews $S2 | pmtiles $S3 | $(stat -c %s "$OUT/$NAME-$tag.pmtiles") B"
done
