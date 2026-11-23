#!/bin/bash
# The steps around build-raster.sh that are not raster tiling.
#   build-extras.sh hillshade <dtmdir> <rawdir>   own hillshade from the WCS terrain -> <rawdir>/hs.tif,
#                                                 then: build-raster.sh <rawdir> <out> hillshade 16 8 WEBP:80 ...
#   build-extras.sh stednavne <repo> <outdir>     data/stednavne.tsv.gz -> stednavne.pmtiles (vector)
#   build-extras.sh quality <renderdir>           SSIM and PSNR of the 1:25.000 renders (quality-25k.txt)
# GDAL and tippecanoe run in the repo's contour image (kort-kurver); quality needs ffmpeg.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
case ${1:-} in
hillshade)
  # RES=1.6: average the terrain to this cell size first (the real 0.4 m DHM tiles); prints the times
  DTM=$2 RAW=$3; mkdir -p "$RAW"
  docker run --rm -u "$(id -u):$(id -g)" -v "$DTM:/dtm:ro" -v "$RAW:/raw" -e RES="${RES:-}" kort-kurver bash -c '
    set -e; cd /dtm; gdalbuildvrt -q /raw/dtm.vrt *.tif; in=/raw/dtm.vrt; s=$(date +%s)
    if [ -n "$RES" ]; then gdalwarp -q -overwrite -r average -tr $RES $RES -multi -wm 1024 \
      -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=3 /raw/dtm.vrt /raw/dtm-avg.tif; in=/raw/dtm-avg.tif; fi
    a=$(date +%s); gdaldem hillshade -q -multidirectional -z 1.5 -co COMPRESS=DEFLATE $in /raw/hs.tif
    echo "average to ${RES:-native} m: $((a - s)) s | gdaldem: $(($(date +%s) - a)) s | peak $(( $(cat /sys/fs/cgroup/memory.peak) / 1048576 )) MB"
    rm -f /raw/dtm.vrt /raw/dtm-avg.tif'
  ls -l "$RAW/hs.tif" ;;
stednavne)
  REPO=$2 OUT=$3; mkdir -p "$OUT"
  node "$HERE/stednavne-geojson.mjs" "$REPO/data/stednavne.tsv.gz" "$OUT/stednavne.geojsons"
  docker run --rm -u "$(id -u):$(id -g)" -v "$OUT:/out" kort-kurver \
    tippecanoe -q -o /out/stednavne.pmtiles -l stednavne -Z6 -z14 -r1 --force /out/stednavne.geojsons
  ls -l "$OUT/stednavne.pmtiles" ;;
quality)
  R=$2
  # Compare RGB only: the PNGs are RGBA with an always-opaque alpha that would inflate PSNR.
  F='[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]'
  q() { # q <ref> <test>: one line "ref=… test All:<ssim> average:<psnr>"
    local s p
    s=$(ffmpeg -hide_banner -i "$R/$1.png" -i "$R/$2.png" -lavfi "${F}ssim" -f null - 2>&1 | grep -o 'All:[0-9.]*')
    p=$(ffmpeg -hide_banner -i "$R/$1.png" -i "$R/$2.png" -lavfi "${F}psnr" -f null - 2>&1 | grep -o 'average:[0-9.]*')
    echo "ref=$1 $2 $s $p"
  }
  for ref in dtk25-25k-300-wms-png dtk25-25k-300-png; do
    [ "$ref" = dtk25-25k-300-wms-png ] && q "$ref" dtk25-25k-300-png
    for v in jpeg-q75 jpeg-q85 webp-q75 webp-q85; do q "$ref" "dtk25-25k-300-$v"; done
  done ;;
*) sed -n 2,7p "$0"; exit 2 ;;
esac
