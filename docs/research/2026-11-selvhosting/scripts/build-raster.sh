#!/bin/bash
# Build one raster layer sample into PMTiles variants and log time, RAM and size.
#   build-raster.sh <rawdir> <outdir> <name> <maxzoom> <minzoom> <variant>...
# variant = FORMAT:QUALITY, e.g. JPEG:85 WEBP:80 PNG:0
# Runs GDAL in the repo's contour image (kort-kurver, scripts/contours/Dockerfile).
# Steps: chunks + world files (EPSG:25832) -> VRT -> warp to EPSG:3857 at the
# max zoom's resolution (lanczos) -> MBTiles (max zoom) -> overviews (average)
# -> PMTiles (OVR=lanczos switches the overview resampling). Time is wall clock; RAM is the container's cgroup memory.peak
# (includes page cache, so it is an upper bound). cpu-s is the container's CPU time (cgroup cpu.stat),
# which stays comparable when other jobs share the machine.
# Options for the real Datafordeler sheets (20 x 20 km GeoTIFF):
#   CLIP="x0 y0 x1 y1"  cut the mosaic to this EPSG:25832 box first (the 10 x 10 km sample)
#   EXPAND=rgb          expand paletted sheets (Lave Målebordsblade) to RGB one by one before the
#                       mosaic: each sheet has its own colour table, and lanczos must resample
#                       colours, not palette indices
set -euo pipefail
RAW=$1 OUT=$2 NAME=$3 MAXZ=$4 MINZ=$5; shift 5
mkdir -p "$OUT"
m() { # m <cmd...>: run in the GDAL container, print "<seconds> s <MB> MB <cpu> cpu-s"; fails if the command fails
  docker run --rm -u "$(id -u):$(id -g)" -v "$RAW:/raw:ro" -v "$OUT:/out" kort-kurver bash -c '
    s=$(date +%s.%N); "$@" >/dev/null || exit $?; e=$(date +%s.%N)
    cpu=$(awk "/^usage_usec/{printf \"%.1f\", \$2/1e6}" /sys/fs/cgroup/cpu.stat)
    echo "$(awk "BEGIN{printf \"%.1f\", $e-$s}") s $(( $(cat /sys/fs/cgroup/memory.peak) / 1048576 )) MB $cpu cpu-s"' _ "$@"
}
log() { echo "$*" | tee -a "$OUT/build-log.txt"; }
RES=$(python3 -c "print(2*20037508.342789244/256/2**$MAXZ)")
# EXPAND: one RGB VRT per sheet first, because each paletted sheet has its own colour table
docker run --rm -u "$(id -u):$(id -g)" -v "$RAW:/raw:ro" -v "$OUT:/out" -e EXPAND="${EXPAND:-}" kort-kurver bash -c \
  "set -e; cd /raw; files=\$(ls *.png *.jpg *.tif 2>/dev/null || true)
  if [ -n \"\$EXPAND\" ]; then mkdir -p /out/$NAME-sheets; e=
    for f in \$files; do gdal_translate -q -of VRT -expand \$EXPAND /raw/\$f /out/$NAME-sheets/\$f.vrt; e=\"\$e /out/$NAME-sheets/\$f.vrt\"; done
    files=\$e; fi
  gdalbuildvrt -q -a_srs EPSG:25832 ${CLIP:+-te $CLIP} /out/$NAME.vrt \$files"
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
