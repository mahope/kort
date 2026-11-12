#!/bin/bash
# Build 5 m contour lines for all of Denmark from the DHM terrain model (WCS,
# Klimadatastyrelsen, CC BY 4.0) into one PMTiles file. The app shows every
# line for "5 m" and only h % 10 == 0 for "10 m".
#
#   kurver-dk.sh [workdir] [parallel]
#
# Per 5 x 5 km cell: a cheap 100 m probe skips open sea, then the terrain is
# fetched at 5 m with a 20 m buffer, averaged to 10 m (so lines do not trace
# every ditch), contoured every 5 m and clipped back to the cell. Resumable:
# cells with a .done marker are skipped.
set -euo pipefail
W=${1:-$HOME/dev/kurver/dk}
P=${2:-6}
T=fd44f26ab5701c01ca9f570e507fe9ab
mkdir -p "$W/cells" "$W/logs"
: > "$W/logs/fejl.log" # failures of this run only
export W T

cell() {
  local x=$1 y=$2 id="$1-$2" B=20
  local d="$W/cells/$id"
  [ -e "$d.done" ] && return 0
  mkdir -p "$d"
  local wcs="https://api.dataforsyningen.dk/dhm_wcs_DAF?service=WCS&version=1.0.0&request=GetCoverage&coverage=dhm_terraen&crs=EPSG:25832&format=GTiff&token=$T"
  # Probe at 100 m: all nodata means sea or outside Denmark.
  curl -sf --retry 4 --retry-delay 5 -H "Referer: https://kort.mahoje.dk/" -o "$d/probe.tif" \
    "$wcs&bbox=$x,$y,$((x+5000)),$((y+5000))&width=50&height=50" || { echo "probe-fail $id" >> "$W/logs/fejl.log"; rm -rf "$d"; return 0; }
  # The WCS answers errors with HTTP 200 and an XML report, so a probe that is not
  # a readable GeoTIFF is a failure (retried next run), never "sea".
  local stats
  if ! stats=$(docker run --rm -u "$(id -u):$(id -g)" -v "$d:/c" kort-kurver gdalinfo -stats /c/probe.tif 2>/dev/null); then
    echo "probe-bad $id" >> "$W/logs/fejl.log"; rm -rf "$d"; return 0
  fi
  if ! grep -E "STATISTICS_MAXIMUM=" <<< "$stats" | grep -vqE "=(-|0(\.0*)?$)"; then
    rm -rf "$d"; touch "$d.done"; return 0
  fi
  local n=$(( (5000 + 2*B) / 5 ))
  curl -sf --retry 4 --retry-delay 10 -H "Referer: https://kort.mahoje.dk/" -o "$d/dtm.tif" \
    "$wcs&bbox=$((x-B)),$((y-B)),$((x+5000+B)),$((y+5000+B))&width=$n&height=$n" || { echo "dtm-fail $id" >> "$W/logs/fejl.log"; rm -rf "$d"; return 0; }
  docker run --rm -u "$(id -u):$(id -g)" -v "$d:/c" kort-kurver bash -c "
    set -e; cd /c
    gdalwarp -q -r average -tr 10 10 dtm.tif s.tif
    gdal_contour -q -a h -i 5 s.tif k.gpkg
    ogr2ogr -q -f GeoJSONSeq -t_srs EPSG:4326 -lco RS=NO -clipsrc $x $y $((x+5000)) $((y+5000)) \
      -dialect SQLITE -sql 'SELECT CAST(h AS integer) AS h, geom FROM contour WHERE h > 0 AND ST_Length(geom) > 50' k.geojsons k.gpkg
  " || { echo "gdal-fail $id" >> "$W/logs/fejl.log"; rm -rf "$d"; return 0; }
  mv "$d/k.geojsons" "$W/cells/$id.geojsons" || { echo "mv-fail $id" >> "$W/logs/fejl.log"; return 0; }
  rm -rf "$d"
  touch "$d.done"
}
export -f cell

# Denmark incl. Bornholm, in 5 km cells (EPSG:25832).
for x in $(seq ${X0:-440000} 5000 ${X1:-895000}); do
  for y in $(seq ${Y0:-6045000} 5000 ${Y1:-6405000}); do
    echo "$x $y"
  done
done | xargs -P "$P" -n 2 bash -c 'cell "$0" "$1"'

echo "celler med kurver: $(ls "$W"/cells/*.geojsons 2>/dev/null | wc -l)"
# Failed cells have no .done marker; a new run retries them. Never publish a file with holes.
if [ -s "$W/logs/fejl.log" ]; then
  echo "KURVER-FEJL: $(wc -l < "$W/logs/fejl.log") celler fejlede, kør scriptet igen"; exit 1
fi
cat "$W"/cells/*.geojsons > "$W/kurver.geojsons"
docker run --rm -u "$(id -u):$(id -g)" -v "$W:/w" kort-kurver \
  tippecanoe -q -o /w/kurver-5m.pmtiles -l kurver -Z11 -z14 --force \
    --attribution "Højdekurver: Klimadatastyrelsen, Danmarks Højdemodel (CC BY 4.0)" \
    --simplification=4 --no-feature-limit --no-tile-size-limit \
    /w/kurver.geojsons
ls -la "$W/kurver-5m.pmtiles"
echo KURVER-FAERDIG
