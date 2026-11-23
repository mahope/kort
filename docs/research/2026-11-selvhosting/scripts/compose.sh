#!/bin/bash
# Side-by-side crops of render PNGs with a label over each, saved as WebP.
#   ZOOM=2 CROP=420x300 compose.sh <out.webp> <label> <png> [<label> <png>]...
# CROP is taken from the centre of each frame; ZOOM scales it with nearest neighbour to show pixels.
set -euo pipefail
OUT=$1; shift
CROP=${CROP:-420x300} ZOOM=${ZOOM:-1}
CW=${CROP%x*} CH=${CROP#*x}
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
inputs=() filters="" n=0
while [ $# -ge 2 ]; do
  label=${1//:/\\:}
  inputs+=(-i "$2")
  filters+="[$n:v]crop=$CW:$CH,scale=iw*$ZOOM:ih*$ZOOM:flags=neighbor,pad=iw+6:ih+28:3:28:white,"
  filters+="drawtext=fontfile=$FONT:text='$label':x=6:y=6:fontsize=16:fontcolor=black[v$n];"
  n=$((n + 1)); shift 2
done
stack=""; for ((i = 0; i < n; i++)); do stack+="[v$i]"; done
ffmpeg -v error -y "${inputs[@]}" -filter_complex "${filters}${stack}hstack=inputs=$n" -c:v libwebp -quality 90 "$OUT"
ls -l "$OUT"
