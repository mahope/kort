#!/bin/bash
# fetch-terrain.sh <outdir> <x0> <y0> <x1> <y1>: download DHM Terraen (0.4 m) for a box in 2 x 2 km
# GetRasterMultipleFiles calls (interior boxes, so neighbouring 1 km tiles are not fetched twice).
# Needs DAFO_KEY in the environment. Skips chunks already done. Logs to <outdir>/fetch-log.txt.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$1 X0=$2 Y0=$3 X1=$4 Y1=$5
mkdir -p "$OUT"
for ((x = X0; x < X1; x += 2000)); do
  for ((y = Y0; y < Y1; y += 2000)); do
    z="$OUT/t_${x}_${y}.zip"
    [ -s "$z" ] && continue
    r=$(python3 -I "$HERE/dafo.py" GetRasterMultipleFiles minx=$((x + 100)) miny=$((y + 100)) \
      maxx=$((x + 1900)) maxy=$((y + 1900)) register=dhm version=1 datasetname=Terraen --out "$z.part" 2>&1)
    mv "$z.part" "$z"
    echo "$x $y $r" | cut -c1-110 | tee -a "$OUT/fetch-log.txt"
  done
done
