#!/bin/bash
# hillshade-cells.sh <outdir> <x0> <y0> <x1> <y1>: hillshade per cell from Datafordeler's dhm_wcs,
# the way the national build (README section 12, 3c) does it, here for a box.
# Per cell: terrain at RES m for the cell plus a BUF m buffer in ONE WCS call
# ((CELL + 2 BUF) / RES px a side; 2,600 m at 1.6 m = 1,625 px), `gdaldem hillshade`, then the
# buffer is cropped so neighbouring cells meet without edge artefacts. The WCS reset a 3,125 px
# call in the gate, so keep CELL at 2,500 m for 1.6 m and 1,250 m for 0.8 m.
# Needs DAFO_KEY in the environment (wcs-probe.py never prints it). Resumable: finished cells are
# skipped; a failed cell stops the run with exit 1 (run again). Writes <outdir>/hs/*.tif and
# <outdir>/cells-log.txt; build-raster.sh <outdir>/hs … then tiles the result.
#   CELL=2500 RES=1.6 BUF=50 hillshade-cells.sh …
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$1 X0=$2 Y0=$3 X1=$4 Y1=$5
CELL=${CELL:-2500} RES=${RES:-1.6} BUF=${BUF:-50}
PX=$(python3 -c "print(round(($CELL + 2 * $BUF) / $RES))")
mkdir -p "$OUT/hs" "$OUT/tmp"
for ((x = X0; x < X1; x += CELL)); do
  for ((y = Y0; y < Y1; y += CELL)); do
    hs="$OUT/hs/hs_${x}_${y}.tif"
    [ -s "$hs" ] && continue
    t=$(date +%s.%N)
    r=$(python3 -I "$HERE/wcs-probe.py" "$OUT/tmp/dtm.tif" $((x - BUF)) $((y - BUF)) $((CELL + 2 * BUF)) "$PX")
    docker run --rm -u "$(id -u):$(id -g)" -v "$OUT:/o" kort-kurver bash -c "set -e
      gdaldem hillshade -q -multidirectional -z 1.5 /o/tmp/dtm.tif /o/tmp/hs.tif
      gdal_translate -q -projwin $x $((y + CELL)) $((x + CELL)) $y -co COMPRESS=DEFLATE /o/tmp/hs.tif /o/tmp/hs-crop.tif"
    mv "$OUT/tmp/hs-crop.tif" "$hs"
    echo "$x $y ${PX}px $r, cell $(awk "BEGIN{printf \"%.1f\", $(date +%s.%N) - $t}") s" | tee -a "$OUT/cells-log.txt"
  done
done
rm -rf "$OUT/tmp"
