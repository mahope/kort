"""Split an `osmium export` GeoJSONSeq of Denmark into the sea chart's layers.

    python3 osm_layers.py <osm.geojsons> <outdir>

Writes one GeoJSONSeq per layer with only the attributes the style uses:

  by        built-up areas (landuse residential/commercial/industrial/retail)
  skov      forest (landuse=forest, natural=wood)
  natur     heath, scrub, wetland, grassland (lighter green)
  vand      lakes and other inland water (natural=water, landuse=reservoir/basin)
  vandloeb  rivers, canals (k=river) and streams (k=stream, from zoom 12)
  sted      town names, r = 1 city, 2 town, 3 village (minzoom by rank)
  oe        island names
  vandnavn  names of seas, bays, straits, fjords (a point on the polygon)
  havn      marinas (k=havn) and anchorages (k=anker), as points
  rende     fairways and recommended tracks (seamark), as lines

Data: OpenStreetMap contributors, ODbL.
"""

import json
import os
import sys

from osgeo import ogr

ogr.UseExceptions()

BUILT = {"residential", "commercial", "industrial", "retail"}
NATUR = {"heath", "scrub", "wetland", "grassland"}
PLACE_RANK = {"city": (1, 6), "town": (2, 8), "village": (3, 11)}
WATER_NAMES = {"bay", "strait", "sea", "fjord", "sound"}
FAIRWAY = {"fairway", "recommended_track", "navigation_line"}
ANCHOR = {"anchorage", "anchor_berth"}


def point_on(geom: dict) -> dict:
    g = ogr.CreateGeometryFromJson(json.dumps(geom))
    if g.GetGeometryType() in (ogr.wkbMultiPolygon, ogr.wkbMultiPolygon25D):
        # Label the largest part: a fjord with many islands is still one name.
        g = max((g.GetGeometryRef(i) for i in range(g.GetGeometryCount())), key=lambda p: p.GetArea())
    p = g.PointOnSurface()
    return {"type": "Point", "coordinates": [round(p.GetX(), 6), round(p.GetY(), 6)]}


def boundary(geom: dict) -> dict:
    g = ogr.CreateGeometryFromJson(json.dumps(geom)).Boundary()
    return json.loads(g.ExportToJson())


def area_ha(geom: dict) -> float:
    g = ogr.CreateGeometryFromJson(json.dumps(geom))
    # Rough: degrees² to hectares at 56° N.
    return g.GetArea() * 111_320 * 62_250 / 10_000


def main() -> None:
    src, outdir = sys.argv[1:3]
    os.makedirs(outdir, exist_ok=True)
    files: dict[str, object] = {}
    counts: dict[str, int] = {}

    def emit(layer: str, geometry: dict, props: dict, minzoom: int | None = None) -> None:
        if layer not in files:
            files[layer] = open(os.path.join(outdir, f"{layer}.geojsons"), "w")
        feat = {"type": "Feature", "geometry": geometry, "properties": props}
        if minzoom is not None:
            feat["tippecanoe"] = {"minzoom": minzoom}
        files[layer].write(json.dumps(feat, ensure_ascii=False) + "\n")
        counts[layer] = counts.get(layer, 0) + 1

    with open(src) as f:
        for line in f:
            line = line.lstrip("\x1e").strip()
            if not line:
                continue
            feat = json.loads(line)
            t = feat.get("properties") or {}
            geom = feat.get("geometry")
            if not geom:
                continue
            kind = geom["type"]
            poly = kind in ("Polygon", "MultiPolygon")
            name = t.get("name")
            seamark = t.get("seamark:type")
            named = {"n": name} if name else {}

            if poly:
                landuse, natural = t.get("landuse"), t.get("natural")
                if landuse in BUILT:
                    emit("by", geom, {})
                elif landuse == "forest" or natural == "wood":
                    emit("skov", geom, {})
                elif natural in NATUR:
                    emit("natur", geom, {})
                elif natural == "water" or landuse in ("reservoir", "basin"):
                    emit("vand", geom, {})
                    if name and area_ha(geom) > 20:
                        emit("vandnavn", point_on(geom), {"n": name, "k": "soe"}, 11)
                if natural in WATER_NAMES or t.get("place") in ("sea", "bay"):
                    if name:
                        emit("vandnavn", point_on(geom), {"n": name, "k": "hav"}, 8)
                if t.get("place") in ("island", "islet") and name:
                    emit("oe", point_on(geom), {"n": name}, 9 if t["place"] == "island" else 12)
                if t.get("leisure") == "marina":
                    emit("havn", point_on(geom), {**named, "k": "havn"}, 10)
                if seamark in ANCHOR:
                    emit("havn", point_on(geom), {**named, "k": "anker"}, 10)
                if seamark in FAIRWAY:
                    emit("rende", boundary(geom), {}, 9)
                continue

            if kind in ("LineString", "MultiLineString"):
                ww = t.get("waterway")
                if ww in ("river", "canal"):
                    emit("vandloeb", geom, {"k": "river"}, 9)
                elif ww == "stream":
                    emit("vandloeb", geom, {"k": "stream"}, 12)
                if seamark in FAIRWAY:
                    emit("rende", geom, {}, 9)
                continue

            if kind == "Point":
                place = t.get("place")
                if place in PLACE_RANK and name:
                    rank, minzoom = PLACE_RANK[place]
                    emit("sted", geom, {"n": name, "r": rank}, minzoom)
                elif place in ("island", "islet") and name:
                    emit("oe", geom, {"n": name}, 9 if place == "island" else 12)
                elif (place in ("sea", "bay") or t.get("natural") in WATER_NAMES) and name:
                    emit("vandnavn", geom, {"n": name, "k": "hav"}, 8)
                if t.get("leisure") == "marina":
                    emit("havn", geom, {**named, "k": "havn"}, 10)
                if seamark in ANCHOR:
                    emit("havn", geom, {**named, "k": "anker"}, 10)
                elif seamark == "harbour":
                    emit("havn", geom, {**named, "k": "havn"}, 10)

    for fh in files.values():
        fh.close()
    for layer in sorted(counts):
        print(f"{layer}: {counts[layer]}")


if __name__ == "__main__":
    main()
