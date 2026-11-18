#!/bin/bash
# Build the vector sea chart ("Søkort" base map) for kort.mahoje.dk as one PMTiles file.
#
#   build-soekort-tiles.sh [workdir]
#
# Needs Docker and ~15 GB free disk; ~7 GB RAM is enough. Every step writes its
# output once and is skipped on the next run, so a failed run is resumed by
# running the script again (delete a step's output to redo it).
#
# Sources (all free licences, see README.md next to this script):
#   depth   EMODnet Bathymetry DTM (CC BY 4.0), WCS, no key. With DDM_TIF=<file>
#           Geodatastyrelsen's Danmarks Dybdemodel 50 m GeoTIFF is laid over it
#           (download from dataforsyningen.dk needs a login; see README).
#   land    OpenStreetMap land polygons and coastline (osmdata.openstreetmap.de, ODbL)
#   land use, lakes, rivers, names, marinas, anchorages, fairways
#           OpenStreetMap, Geofabrik's Denmark extract (ODbL)
#   Natura 2000  Miljøstyrelsen via Danmarks Miljøportal (WFS, frie data)
#   wrecks, lake depths  the snapshots in public/data/soekort (round 2)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
W=${1:-$HOME/dev/soekort-vektor}
IMG=kort-soekort
mkdir -p "$W/dl" "$W/work" "$W/osm" "$W/layers"

# Denmark's waters with Skagerrak, the western Baltic and Bornholm.
LON0=7; LON1=16; LAT0=54; LAT1=58
EMOD_RES=0.0010416666666667 # 1/16 arc minute, EMODnet's native grid

dk() { docker run --rm -u "$(id -u):$(id -g)" -v "$W:/w" -v "$HERE:/s:ro" -v "$REPO/public/data/soekort:/r:ro" -w /w "$IMG" "$@"; }
step() { echo "== $(date +%H:%M:%S) $*"; }

docker build -q -t "$IMG" "$HERE" >/dev/null

step "EMODnet-dybder (1 x 1 grad pr. fil)"
for lon in $(seq $LON0 $((LON1-1))); do
  for lat in $(seq $LAT0 $((LAT1-1))); do
    f="$W/dl/emodnet/$lon-$lat.tif"
    [ -s "$f" ] && continue
    mkdir -p "$W/dl/emodnet"
    curl -sf --retry 4 --retry-delay 10 -o "$f.tmp" \
      "https://ows.emodnet-bathymetry.eu/wcs?service=WCS&version=1.0.0&request=GetCoverage&coverage=emodnet:mean&crs=EPSG:4326&bbox=$lon,$lat,$((lon+1)),$((lat+1))&format=image/tiff&resx=$EMOD_RES&resy=$EMOD_RES"
    # The WCS answers errors with HTTP 200 and XML: only keep a real GeoTIFF.
    head -c 4 "$f.tmp" | grep -q -e "MM" -e "II" || { echo "EMODnet-fejl for $lon,$lat"; rm -f "$f.tmp"; exit 1; }
    mv "$f.tmp" "$f"
  done
done

step "OSM: Danmark, landpolygoner og kystlinje"
[ -s "$W/dl/denmark-latest.osm.pbf" ] || curl -sfL -o "$W/dl/denmark-latest.osm.pbf" https://download.geofabrik.de/europe/denmark-latest.osm.pbf
for z in land-polygons-split-4326 coastlines-split-4326; do
  [ -s "$W/dl/$z.zip" ] || curl -sfL -o "$W/dl/$z.zip" "https://osmdata.openstreetmap.de/download/$z.zip"
  [ -d "$W/dl/$z" ] || dk unzip -q -o "/w/dl/$z.zip" -d /w/dl
done

step "Natura 2000 (habitat- og fuglebeskyttelsesområder)"
for t in habitat_omr fugle_bes_omr; do
  f="$W/dl/$t.geojson"
  [ -s "$f" ] && continue
  curl -sf --retry 4 -o "$f.tmp" \
    "https://arealeditering-dist-geo.miljoeportal.dk/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=dai:$t&outputFormat=application/json&srsName=EPSG:4326&propertyName=Objektnavn,Site_nr,Shape"
  grep -q '"FeatureCollection"' "$f.tmp" || { echo "WFS-fejl for $t"; exit 1; }
  mv "$f.tmp" "$f"
done

step "Land: klip og saml landpolygoner"
if [ ! -s "$W/work/land.gpkg" ]; then
  dk ogr2ogr -q -f GPKG /w/work/land-split.gpkg /w/dl/land-polygons-split-4326/land_polygons.shp \
    -spat $((LON0-1)) $((LAT0-1)) $((LON1+1)) $((LAT1+1)) -nln land
  # One polygon per island: the 1-degree split lines would show as seams in the fill.
  dk ogr2ogr -q -f GPKG /w/work/land.gpkg /w/work/land-split.gpkg -nln land -explodecollections \
    -dialect SQLITE -sql "SELECT ST_Union(geom) AS geom FROM land"
fi
if [ ! -s "$W/layers/kyst.geojsons" ]; then
  dk ogr2ogr -q -f GeoJSONSeq /w/layers/kyst.geojsons /w/dl/coastlines-split-4326/lines.shp \
    -spat $LON0 $LAT0 $LON1 $LAT1 -clipsrc $LON0 $LAT0 $LON1 $LAT1 -select "" -lco RS=NO
fi
if [ ! -s "$W/layers/land.geojsons" ]; then
  dk ogr2ogr -q -f GeoJSONSeq /w/layers/land.geojsons /w/work/land.gpkg -clipsrc $LON0 $LAT0 $LON1 $LAT1 -lco RS=NO
fi

step "Dybdemodel: flet, 50 m i EPSG:3035"
if [ ! -s "$W/work/elev.tif" ]; then
  dk bash -c 'gdalbuildvrt -q /w/work/emodnet.vrt /w/dl/emodnet/*.tif'
  SRC=/w/work/emodnet.vrt
  if [ -n "${DDM_TIF:-}" ]; then
    # Not run yet (the GeoTIFF needs a login). Check the file's sign first: DDM_CALC
    # must turn it into elevation (negative below sea level); "-A" if it holds depths.
    cp "$DDM_TIF" "$W/dl/ddm50.tif"
    dk gdal_calc -A /w/dl/ddm50.tif --outfile=/w/work/ddm-elev.tif --calc="${DDM_CALC:--A}" --NoDataValue=-32768 --quiet
    dk gdalwarp -q -t_srs EPSG:4326 -tr $EMOD_RES $EMOD_RES -r average /w/work/ddm-elev.tif /w/work/ddm-4326.tif
    dk gdalbuildvrt -q /w/work/merged.vrt /w/work/emodnet.vrt /w/work/ddm-4326.tif
    SRC=/w/work/merged.vrt
  fi
  # A cubic spline from the 115 m grid gives the soft band edges of a printed chart.
  dk gdalwarp -q -t_srs EPSG:3035 -tr 50 50 -r cubicspline -te_srs EPSG:4326 -te $LON0 $LAT0 $LON1 $LAT1 \
    -co COMPRESS=DEFLATE -co TILED=YES -co BIGTIFF=YES -co PREDICTOR=3 "$SRC" /w/work/elev.tif
fi
if [ ! -s "$W/work/land.tif" ]; then
  dk ogr2ogr -q -f GPKG -t_srs EPSG:3035 /w/work/land-3035.gpkg /w/work/land-split.gpkg
  dk python3 /s/land_raster.py /w/work/elev.tif /w/work/land-3035.gpkg /w/work/land.tif
fi

step "Dybder: kystkant og dybdetal"
if [ ! -s "$W/layers/tal.geojsons" ]; then
  dk python3 /s/bathy.py /w/work/elev.tif /w/work/land.tif /w/work/depth.tif /w/layers/tal.geojsons.tmp
  mv "$W/layers/tal.geojsons.tmp" "$W/layers/tal.geojsons"
fi

step "Dybdebånd (polygoner) og dybdekurver (linjer)"
if [ ! -s "$W/layers/dybde.geojsons" ]; then
  # Bands 0-1, 1-2, 2-3, 3-5, 5-10, 10-20, 20-50 m; deeper is the map's background.
  dk gdal_contour -q -p -amin lo -amax hi -fl -50 -20 -10 -5 -3 -2 -1 0 /w/work/depth.tif /w/work/baand.gpkg
  dk ogr2ogr -q -f GeoJSONSeq -t_srs EPSG:4326 -lco RS=NO /w/layers/dybde.geojsons /w/work/baand.gpkg \
    -dialect SQLITE -sql "SELECT CAST(-hi AS integer) AS d, geom FROM contour WHERE hi <= 0 AND hi > -50"
fi
if [ ! -s "$W/layers/kurve.geojsons" ]; then
  dk gdal_contour -q -a e -fl -50 -30 -20 -10 -5 -3 -2 -1 /w/work/depth.tif /w/work/kurver.gpkg
  dk ogr2ogr -q -f GeoJSONSeq -t_srs EPSG:4326 -lco RS=NO /w/layers/kurve.geojsons /w/work/kurver.gpkg \
    -dialect SQLITE -sql "SELECT CAST(-e AS integer) AS d, geom FROM contour WHERE ST_Length(geom) > 300"
fi

step "OSM-lag"
if [ ! -s "$W/osm/osm.geojsons" ]; then
  dk osmium tags-filter --overwrite -o /w/osm/filtered.osm.pbf /w/dl/denmark-latest.osm.pbf \
    wa/landuse=residential,commercial,industrial,retail,forest,reservoir,basin \
    wa/natural=wood,water,heath,scrub,wetland,grassland,bay,strait,fjord,sound \
    nwa/place=city,town,village,island,islet,sea,bay nw/waterway=river,stream,canal \
    nwa/leisure=marina nwa/seamark:type=anchorage,anchor_berth,harbour,fairway,recommended_track,navigation_line \
    n/natural=bay,strait,fjord,sound
  dk osmium export --overwrite -f geojsonseq -x print_record_separator=false -o /w/osm/osm.geojsons /w/osm/filtered.osm.pbf
fi
if [ ! -s "$W/osm/layers/by.geojsons" ]; then
  dk python3 /s/osm_layers.py /w/osm/osm.geojsons /w/osm/layers
fi

step "Natura 2000: saml grænser og navne"
if [ ! -s "$W/layers/natura.geojsons" ]; then
  dk bash -c 'set -e; cd /w/work
    ogr2ogr -q -f GPKG natura.gpkg /w/dl/habitat_omr.geojson -nln n -nlt MULTIPOLYGON -makevalid
    ogr2ogr -q -append -f GPKG natura.gpkg /w/dl/fugle_bes_omr.geojson -nln n -nlt MULTIPOLYGON -makevalid
    # Habitat and bird areas overlap: draw one dashed boundary around their union.
    ogr2ogr -q -f GeoJSONSeq -lco RS=NO /w/layers/natura.geojsons natura.gpkg -dialect SQLITE \
      -sql "SELECT ST_Boundary(ST_Union(geom)) AS geom FROM n" -explodecollections
    ogr2ogr -q -f GeoJSONSeq -lco RS=NO /w/layers/naturanavn.geojsons natura.gpkg -dialect SQLITE \
      -sql "SELECT Objektnavn AS n, ST_PointOnSurface(ST_Union(geom)) AS geom FROM n WHERE Objektnavn IS NOT NULL GROUP BY Objektnavn"'
fi

step "Vrag og sødybder fra public/data/soekort"
dk ogr2ogr -q -f GeoJSONSeq -lco RS=NO /w/layers/vrag.geojsons /r/vrag.geojson
dk ogr2ogr -q -f GeoJSONSeq -lco RS=NO /w/layers/soe.geojsons /r/soedybder.geojson

step "tippecanoe"
T="tippecanoe -q --force -z14"
L=/w/layers; O=/w/osm/layers; M=/w/work/mb
mkdir -p "$W/work/mb"
# Depth bands: shared borders are simplified alike, so no slivers open between bands.
dk $T -Z5 -o $M/dybde.mbtiles -L dybde:$L/dybde.geojsons --detect-shared-borders --simplification=4 \
  --no-tiny-polygon-reduction --no-feature-limit --no-tile-size-limit
dk $T -Z5 -o $M/land.mbtiles -L land:$L/land.geojsons -L kyst:$L/kyst.geojsons --simplification=4 \
  --no-tiny-polygon-reduction --no-feature-limit --no-tile-size-limit
dk $T -Z8 -o $M/kurve.mbtiles -L kurve:$L/kurve.geojsons --simplification=4 --no-feature-limit --no-tile-size-limit
dk $T -Z9 -o $M/tal.mbtiles -L tal:$L/tal.geojsons -r1 --no-feature-limit --no-tile-size-limit
dk $T -Z8 -o $M/flade.mbtiles -L by:$O/by.geojsons -L skov:$O/skov.geojsons -L natur:$O/natur.geojsons \
  --simplification=4 --drop-smallest-as-needed --coalesce
dk $T -Z6 -o $M/vand.mbtiles -L vand:$O/vand.geojsons --simplification=4 --drop-smallest-as-needed
dk $T -Z6 -o $M/linjer.mbtiles -L vandloeb:$O/vandloeb.geojsons -L rende:$O/rende.geojsons \
  -L natura:$L/natura.geojsons -L soe:$L/soe.geojsons --simplification=4 --no-feature-limit --no-tile-size-limit
dk $T -Z6 -o $M/punkter.mbtiles -L sted:$O/sted.geojsons -L oe:$O/oe.geojsons -L vandnavn:$O/vandnavn.geojsons \
  -L havn:$O/havn.geojsons -L vrag:$L/vrag.geojsons -L naturanavn:$L/naturanavn.geojsons -r1 --no-feature-limit --no-tile-size-limit
dk tile-join -q --force -pk -o /w/soekort.pmtiles \
  -n "kort.mahoje.dk søkort" -A "Dybder: EMODnet Bathymetry (CC BY 4.0). Land: © OpenStreetMap-bidragydere (ODbL). Natura 2000: Miljøstyrelsen" \
  $M/dybde.mbtiles $M/land.mbtiles $M/kurve.mbtiles $M/tal.mbtiles $M/flade.mbtiles $M/vand.mbtiles $M/linjer.mbtiles $M/punkter.mbtiles
ls -la "$W/soekort.pmtiles"
echo SOEKORT-FAERDIG
