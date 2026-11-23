#!/usr/bin/env python3
"""Build the depth tiles (soekort.pmtiles) for a classic nautical-chart look.

Sources, all fetched without a key:
  - Danmarks Dybdemodel 2024, 50 m (Geodatastyrelsen), GeoTIFF from the
    agency's public download weblink (the one Dataforsyningen links for
    dataset 4817, "Uden brugerregistrering").
  - EMODnet Bathymetry DTM (CC BY 4.0) via WCS, only outside the model.
  - NOVANA lake depth bands (Danmarks Miljøportal WFS) and the whole-metre
    lake contours already in public/data/soekort/soedybder.geojson.

Output: one PMTiles file with three layers:
  depth_areas     polygons, d0/d1 = band from/to (m), src = ddm|emodnet|novana
  depth_contours  lines, d = depth (m), src
  depth_labels    points, d = depth (m), k = c (contour label, a = angle)
                  | s (shoal sounding) | g (grid sounding), src

Generalisation is done per zoom tier, each from its own smoothed grid, so
lines are smooth at every scale and never trace the 50 m cells:
  t3  z5-8   200 m grid (block mean), blur 300 m
  t2  z9-11  50 m grid, blur 90 m
  t1  z12-14 50 m grid, blur 40 m, cubic spline to 25 m
The model's own coast is generalised (1:100.000). Band polygons therefore
run 1 km past it (nearest-value fill) and the app draws them under the base
map's land, so the base map decides the coastline. Contours stop at the model.

Runs inside the kort-ddm Docker image (see Dockerfile and build.sh):
  python3 build.py /work [step ...] [--bbox x0 y0 x1 y1 (EPSG:3034)] [--repo /repo]
Every step is cached in the workdir; --force redoes the given steps.
"""
import argparse
import json
import math
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import warnings

import numpy as np
from osgeo import gdal, ogr, osr
from scipy import ndimage

gdal.UseExceptions()
ogr.UseExceptions()
gdal.SetConfigOption("GDAL_NUM_THREADS", "ALL_CPUS")
gdal.SetCacheMax(1024 * 1024 * 1024)

DDM_WEBLINK = (
    "https://ftp.sdfe.dk/main.html?download&weblink=b4324b6389898704fd8ec7484882dbf3"
    "&subfolder=2024&realfilename="
)
DDM_FILE = "ddm_50m.dybde.tiff"
DDM_SHA256 = "a8f1811b91d918c073f745b027e810be828d42657e52eddb58edfe8733ddea41"  # version 2.0 (2024)
EMOD_WCS = (
    "https://ows.emodnet-bathymetry.eu/wcs?service=WCS&version=1.0.0&request=GetCoverage"
    "&coverage=emodnet:mean&crs=EPSG:4326&format=image/tiff"
)
EMOD_RES = 1 / 960  # 1/16 arc minute, the DTM's own cell
EMOD_LON = range(3, 17)  # 1 degree tiles, west edges
EMOD_LAT = range(53, 60)  # south edges
NOVANA_WFS = (
    "https://geodata.fvm.dk/geoserver/NOVANA/ows?service=WFS&version=2.0.0&request=GetFeature"
    "&typeNames=NOVANA:Soe_dybdekort_konturer&outputFormat=application/json&srsName=EPSG:4326&count=5000"
)

# Contour depths; the band edges are the same levels.
LEVELS_FINE = [1, 2, 3, 4, 5, 10, 15, 20, 30, 50, 100, 200]
TIERS = {
    "t1": dict(zoom=(12, 14), blur=40, out_cell=25, levels=LEVELS_FINE,
               min_area=3_000, min_len=200, label_spacing=2_000, label_half=90, sounding_block=1_000),
    "t2": dict(zoom=(9, 11), blur=90, out_cell=50, levels=[2, 5, 10, 20, 30, 50, 100, 200],
               min_area=60_000, min_len=1_000, label_spacing=4_000, label_half=300, sounding_block=None),
    "t3": dict(zoom=(5, 8), blur=300, out_cell=200, levels=[2, 5, 10, 20, 50, 100, 200],
               min_area=1_500_000, min_len=6_000, label_spacing=40_000, label_half=1_500, sounding_block=None),
}
EMOD_LEVELS = {"t1": [5, 10, 20, 50, 100, 200], "t2": [5, 10, 20, 50, 100, 200], "t3": [10, 20, 50, 100, 200]}
FILL_CELLS = 20  # 1 km past the model's coast, under the base map's land

# The DDM50 terms must be made available to third parties: the link goes with the file.
DDM_TERMS_URL = (  # = DDM_TERMS_URL in src/lib/map/sources.ts
    "https://dataforsyningen.dk/asset/PDF/rettigheder_vilkaar/Vilk%C3%A5r%20og%20betingelser%20for%20brug%20af%20"
    "marine%20data%20indeholdt%20i%20Danmarks%20Dybdemodel%2050%20m%20opl%C3%B8sning.pdf"
)
ATTRIBUTION = (
    "Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning, hentet {date}. "
    'Model og data er ikke egnet til navigation (<a href="' + DDM_TERMS_URL + '">vilkår</a>). '
    "EMODnet Bathymetry (CC BY 4.0). Sødybder: Danmarks Miljøportal (NOVANA)"
)

S3034 = osr.SpatialReference()
S3034.ImportFromEPSG(3034)
S4326 = osr.SpatialReference()
S4326.ImportFromEPSG(4326)
S3857 = osr.SpatialReference()
S3857.ImportFromEPSG(3857)
for s in (S3034, S4326, S3857):
    s.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
TO_4326 = osr.CoordinateTransformation(S3034, S4326)
TO_3857 = osr.CoordinateTransformation(S3034, S3857)
M_TO_4326 = osr.CoordinateTransformation(S3857, S4326)
LL_TO_3034 = osr.CoordinateTransformation(S4326, S3034)


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def fetch(url, path, tries=4):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "kort.mahoje.dk depth build"})
            with urllib.request.urlopen(req, timeout=600) as r, open(path + ".part", "wb") as f:
                while chunk := r.read(1 << 20):
                    f.write(chunk)
            os.replace(path + ".part", path)
            return path
        except Exception as e:  # noqa: BLE001 - retried, then raised
            log(f"fetch failed ({i + 1}/{tries}): {url[:90]}: {e}")
            time.sleep(5 * (i + 1))
    raise RuntimeError(f"could not fetch {url}")


def sha256(path):
    out = subprocess.run(["sha256sum", path], check=True, capture_output=True, text=True).stdout
    return out.split()[0]


# ---------------------------------------------------------------------------
# Grids
# ---------------------------------------------------------------------------

def write_grid(path, arr, gt, cell=None):
    """Float32 GeoTIFF in EPSG:3034, NaN as nodata."""
    drv = gdal.GetDriverByName("GTiff")
    ds = drv.Create(path, arr.shape[1], arr.shape[0], 1, gdal.GDT_Float32,
                    ["COMPRESS=DEFLATE", "PREDICTOR=3", "TILED=YES", "BIGTIFF=IF_SAFER"])
    if cell:
        gt = (gt[0], cell, 0, gt[3], 0, -cell)
    ds.SetGeoTransform(gt)
    ds.SetProjection(S3034.ExportToWkt())
    b = ds.GetRasterBand(1)
    b.SetNoDataValue(float("nan"))
    b.WriteArray(arr)
    ds = None
    return path


def blur(a, sigma_cells):
    """Gaussian blur that ignores NaN (normalised convolution); NaN stays NaN."""
    w = np.isfinite(a)
    v = np.where(w, a, 0).astype(np.float32)
    ndimage.gaussian_filter(v, sigma_cells, output=v, mode="nearest", truncate=3.0)
    ww = w.astype(np.float32)
    ndimage.gaussian_filter(ww, sigma_cells, output=ww, mode="nearest", truncate=3.0)
    with np.errstate(invalid="ignore", divide="ignore"):
        v /= ww
    v[~w] = np.nan
    return v


def block_mean(a, f):
    h, w = (a.shape[0] // f) * f, (a.shape[1] // f) * f
    b = a[:h, :w].reshape(h // f, f, w // f, f)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)  # all-NaN blocks
        return np.nanmean(b, axis=(1, 3)).astype(np.float32)


def fill_coast(a, cells):
    """Nearest-value fill up to `cells` past the data (GDAL FillNodata)."""
    mem = gdal.GetDriverByName("MEM").Create("", a.shape[1], a.shape[0], 1, gdal.GDT_Float32)
    b = mem.GetRasterBand(1)
    b.SetNoDataValue(-9999)
    b.WriteArray(np.where(np.isfinite(a), a, -9999).astype(np.float32))
    gdal.FillNodata(b, None, maxSearchDist=cells, smoothingIterations=0, options=["TEMP_FILE_DRIVER=MEM"])
    out = b.ReadAsArray().astype(np.float32)
    out[out == -9999] = np.nan
    return out


def load_ddm(raw, bbox):
    ds = gdal.Open(raw)
    if bbox:
        ds = gdal.Translate("/vsimem/ddm.tif", ds, projWin=[bbox[0], bbox[3], bbox[2], bbox[1]])
    a = ds.GetRasterBand(1).ReadAsArray().astype(np.float32)
    a[a > 1e30] = np.nan
    return a, ds.GetGeoTransform()


def load_emodnet(work, gt, shape, ddm_valid):
    """EMODnet depths on the 50 m model grid's extent at 100 m, outside the model only."""
    d = os.path.join(work, "emodnet")
    os.makedirs(d, exist_ok=True)
    tiles = []
    for lon in EMOD_LON:
        for lat in EMOD_LAT:
            p = os.path.join(d, f"emod_{lon}_{lat}.tif")
            url = f"{EMOD_WCS}&bbox={lon},{lat},{lon + 1},{lat + 1}&resx={EMOD_RES}&resy={EMOD_RES}"
            fetch(url, p)
            tiles.append(p)
    vrt = gdal.BuildVRT(os.path.join(d, "emod.vrt"), tiles)
    vrt = None
    cell = 100
    x0, y1 = gt[0], gt[3]
    x1, y0 = x0 + shape[1] * gt[1], y1 + shape[0] * gt[5]
    # The model's extent plus a margin for Skagerrak, the Swedish coast and the Oslofjord.
    ext = (x0 - 20_000, y0 - 20_000, x1 + 20_000, max(y1, 3_560_000))
    if (x1 - x0) < 300_000:  # test runs on a small box: no margin
        ext = (x0, y0, x1, y1)
    out = gdal.Warp("/vsimem/emod3034.tif", os.path.join(d, "emod.vrt"), dstSRS="EPSG:3034",
                    outputBounds=ext, xRes=cell, yRes=cell, resampleAlg="cubicspline",
                    outputType=gdal.GDT_Float32, dstNodata=float("nan"))
    e = out.GetRasterBand(1).ReadAsArray().astype(np.float32)
    egt = out.GetGeoTransform()
    depth = np.where(e < 0, -e, np.nan).astype(np.float32)
    # Where the model has data (resampled to 100 m), EMODnet is not used.
    f = int(round(cell / gt[1]))
    mvalid = block_mean(np.where(ddm_valid, 1.0, np.nan), f)
    mvalid = np.isfinite(mvalid)
    ox = int(round((x0 - egt[0]) / cell))
    oy = int(round((egt[3] - y1) / cell))
    model = np.zeros(depth.shape, bool)
    model[oy:oy + mvalid.shape[0], ox:ox + mvalid.shape[1]] = mvalid
    outside = ~model
    # No slivers along the Danish coast (narrower than 2 km) and no small
    # inland pockets below sea level (Lammefjord): keep large connected sea only.
    outside = ndimage.binary_opening(outside, iterations=10)
    sea = outside & np.isfinite(depth)
    lab, n = ndimage.label(sea)
    if n:
        sizes = ndimage.sum(sea, lab, index=np.arange(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes >= 30_000  # 300 km²
        sea = keep[lab]
    depth[~sea] = np.nan
    log(f"EMODnet: {np.isfinite(depth).sum() / 100:.0f} km² outside the model")
    return depth, egt


# ---------------------------------------------------------------------------
# Vectors
# ---------------------------------------------------------------------------

class Seq:
    """GeoJSONSeq writer (EPSG:4326, 6 decimals = 0.1 m)."""

    def __init__(self, path):
        self.f = open(path, "w", encoding="utf-8")
        self.n = 0

    def write(self, props, geom_json):
        self.f.write('{"type":"Feature","properties":' + json.dumps(props, ensure_ascii=False, separators=(",", ":"))
                     + ',"geometry":' + geom_json + "}\n")
        self.n += 1

    def close(self):
        self.f.close()


def geom_json(g):
    return g.ExportToJson(["COORDINATE_PRECISION=6"])


def contour(path_grid, levels, polygons):
    ds = gdal.Open(path_grid)
    drv = ogr.GetDriverByName("MEM")
    vds = drv.CreateDataSource("c")
    lyr = vds.CreateLayer("c", S3034, ogr.wkbMultiPolygon if polygons else ogr.wkbLineString)
    if polygons:
        lyr.CreateField(ogr.FieldDefn("d0", ogr.OFTReal))
        lyr.CreateField(ogr.FieldDefn("d1", ogr.OFTReal))
        opts = ["POLYGONIZE=YES", "ELEV_FIELD_MIN=0", "ELEV_FIELD_MAX=1"]
    else:
        lyr.CreateField(ogr.FieldDefn("d", ogr.OFTReal))
        opts = ["ELEV_FIELD=0"]
    if polygons:
        # GDAL only polygonises between the given levels: add the open ends
        # (shallower than the first level, deeper than the last).
        levels = [-1000, *levels, 100_000]
    opts.append("FIXED_LEVELS=" + ",".join(str(v) for v in levels))
    gdal.ContourGenerateEx(ds.GetRasterBand(1), lyr, options=opts)
    return vds, lyr


def band_from(v, levels):
    lo = 0
    for lv in levels:
        if v + 1e-6 >= lv:
            lo = lv
    return lo


def write_areas(lyr, levels, min_area, src, out):
    n = 0
    for feat in lyr:
        d0 = band_from(feat.GetField(0), levels)
        d1v = feat.GetField(1)
        d1 = next((lv for lv in levels if lv > d0), None)
        if d1v is not None and d1 is not None and d1v < d1 - 1e-6:
            d1 = d1v
        g = feat.GetGeometryRef()
        for i in range(g.GetGeometryCount()):
            poly = g.GetGeometryRef(i)
            outer = poly.GetGeometryRef(0)
            if ring_area(outer) < min_area:
                continue
            p = ogr.Geometry(ogr.wkbPolygon)
            p.AddGeometry(outer)
            for j in range(1, poly.GetGeometryCount()):
                r = poly.GetGeometryRef(j)
                if ring_area(r) >= min_area:
                    p.AddGeometry(r)
            p.Transform(TO_4326)
            props = {"d0": d0, "src": src}
            if d1 is not None:
                props["d1"] = d1
            out.write(props, geom_json(p))
            n += 1
    return n


def ring_area(r):
    p = ogr.Geometry(ogr.wkbPolygon)
    p.AddGeometry(r)
    return p.GetArea()


def write_lines(lyr, min_len, src, out, labels, spacing, half):
    n = 0
    for feat in lyr:
        d = feat.GetField(0)
        d = int(d) if float(d).is_integer() else d
        g = feat.GetGeometryRef()
        parts = [g] if g.GetGeometryType() in (ogr.wkbLineString, ogr.wkbLineString25D) else \
            [g.GetGeometryRef(i) for i in range(g.GetGeometryCount())]
        for part in parts:
            if part.Length() < min_len:
                continue
            m = part.Clone()
            m.Transform(TO_3857)
            place_labels(m.GetPoints(), d, src, labels, spacing, half)
            part = part.Clone()
            part.Transform(TO_4326)
            out.write({"d": d, "src": src}, geom_json(part))
            n += 1
    return n


def place_labels(pts, d, src, out, spacing, half):
    """Label anchors on straight stretches of a contour, every `spacing` m (Web Mercator metres)."""
    if len(pts) < 2:
        return
    xy = np.asarray([(p[0], p[1]) for p in pts])
    seg = np.hypot(*np.diff(xy, axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    total = cum[-1]
    # Mercator metres are 1/cos(lat) longer than ground metres; scale the targets.
    lat = math.degrees(2 * math.atan(math.exp(xy[0, 1] / 6378137)) - math.pi / 2)
    k = 1 / math.cos(math.radians(lat))
    sp, hf = spacing * k, half * k
    if total < 2 * hf:
        return

    def at(s):
        return np.array([np.interp(s, cum, xy[:, 0]), np.interp(s, cum, xy[:, 1])])

    starts = np.arange(sp / 2, total, sp) if total > sp else [total / 2]
    for s0 in starts:
        for shift in (0, sp / 6, -sp / 6, sp / 3, -sp / 3):
            s = s0 + shift
            if s - hf < 0 or s + hf > total:
                continue
            a, b, c = at(s - hf), at(s), at(s + hf)
            chord = np.hypot(*(c - a))
            # Straight enough: chord close to the arc, and the middle near the chord.
            u, v = c - a, b - a
            dev = abs(u[0] * v[1] - u[1] * v[0]) / max(chord, 1e-9)
            if chord / (2 * hf) < 0.97 or dev > 0.08 * hf:
                continue
            ang = math.degrees(math.atan2(c[1] - a[1], c[0] - a[0]))
            rot = -ang  # MapLibre text-rotate is clockwise, Mercator y points north
            if rot > 90:
                rot -= 180
            elif rot <= -90:
                rot += 180
            lon, la, _ = M_TO_4326.TransformPoint(float(b[0]), float(b[1]))
            out.write({"d": d, "k": "c", "a": round(rot, 1), "src": src},
                      json.dumps({"type": "Point", "coordinates": [round(lon, 6), round(la, 6)]}))
            break


def nan_mean(a, size):
    """Mean over a size x size window of the finite cells only; NaN where the window has none."""
    w = np.isfinite(a)
    v = ndimage.uniform_filter(np.where(w, a, 0).astype(np.float64), size=size, mode="nearest")
    n = ndimage.uniform_filter(w.astype(np.float64), size=size, mode="nearest")
    with np.errstate(invalid="ignore", divide="ignore"):
        out = v / n
    out[n < 1e-9] = np.nan
    return out.astype(np.float32)


def write_soundings(raw, smooth, gt, block_m, out):
    """Shoal soundings (local minima of the smoothed model, k=s) and a sparse grid (k=g).

    Values come from the unsmoothed 50 m model, truncated to 0.1 m (shoal side), as charts do.
    """
    cell = gt[1]
    n = 0
    # Shoals: a local minimum over 750 m that is at least 1 m shallower than its surroundings.
    win = int(round(750 / cell)) | 1
    s = np.where(np.isfinite(smooth), smooth, 9999)
    mn = ndimage.minimum_filter(s, size=win, mode="nearest")
    # uniform_filter would spread NaN far beyond the window; average the finite cells instead.
    ring = nan_mean(smooth, win * 2 + 1)
    valid_all = ndimage.minimum_filter(np.isfinite(raw).astype(np.uint8), size=win) == 1
    with np.errstate(invalid="ignore"):
        shoal = (s == mn) & valid_all & (smooth < 30) & (ring - smooth > 1.0)
    ys, xs = np.nonzero(shoal)
    for y, x in zip(ys, xs):
        n += sounding(raw[y, x], gt, x, y, "s", out)
    # Grid: one sounding per block (the shallowest cell), only where the block is all water.
    b = int(round(block_m / cell))
    h, w = (raw.shape[0] // b) * b, (raw.shape[1] // b) * b
    blocks = raw[:h, :w].reshape(h // b, b, w // b, b).transpose(0, 2, 1, 3).reshape(h // b, w // b, b * b)
    full = np.isfinite(blocks).all(axis=2)
    for by, bx in zip(*np.nonzero(full)):
        cells = blocks[by, bx]
        i = int(np.argmin(cells))
        y, x = by * b + i // b, bx * b + i % b
        if shoal[max(0, y - win):y + win, max(0, x - win):x + win].any():
            continue  # a shoal sounding is already close
        n += sounding(raw[y, x], gt, x, y, "g", out)
    return n


def sounding(v, gt, x, y, kind, out):
    if not np.isfinite(v):
        return 0
    v = math.floor(float(v) * 10) / 10
    px, py = gt[0] + (x + 0.5) * gt[1], gt[3] + (y + 0.5) * gt[5]
    lon, lat, _ = TO_4326.TransformPoint(px, py)
    out.write({"d": v, "k": kind, "src": "ddm"},
              json.dumps({"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]}))
    return 1


# ---------------------------------------------------------------------------
# Lakes (NOVANA)
# ---------------------------------------------------------------------------

def lakes(work, repo, bbox_ll, out):
    path = fetch(NOVANA_WFS, os.path.join(work, "novana_konturer.json"))
    raw = open(path, "rb").read()
    try:
        data = json.loads(raw.decode("utf-8"))
    except UnicodeDecodeError:  # the server sends Latin-1 names
        data = json.loads(raw.decode("latin-1"))
    groups = {}
    for f in data["features"]:
        p = f["properties"]
        if not f.get("geometry"):
            continue  # a few bands have no geometry
        g = ogr.CreateGeometryFromJson(json.dumps(f["geometry"]))
        if bbox_ll and not g.Intersects(bbox_ll):
            continue
        d0 = band_from(float(p["contourmin"]), LEVELS_FINE)
        groups.setdefault((p["soe_navn"], d0), []).append(g)
    lines = json.load(open(os.path.join(repo, "public/data/soekort/soedybder.geojson"), encoding="utf-8"))
    n = 0
    for (_lake, d0), gs in groups.items():
        u = ogr.Geometry(ogr.wkbMultiPolygon)
        for g in gs:
            if g.GetGeometryType() == ogr.wkbMultiPolygon:
                for i in range(g.GetGeometryCount()):
                    u.AddGeometry(g.GetGeometryRef(i))
            else:
                u.AddGeometry(g)
        u = u.UnionCascaded()
        d1 = next((lv for lv in LEVELS_FINE if lv > d0), None)
        props = {"d0": d0, "src": "novana"}
        if d1 is not None:
            props["d1"] = d1
        out.write(props, geom_json(u))
        n += 1
    to_3857 = osr.CoordinateTransformation(S4326, S3857)
    cfg = TIERS["t1"]
    for f in lines["features"]:
        g = ogr.CreateGeometryFromJson(json.dumps(f["geometry"]))
        if bbox_ll and not g.Intersects(bbox_ll):
            continue
        d = f["properties"]["d"]
        out.write({"d": d, "src": "novana"}, geom_json(g))
        n += 1
        m = g.Clone()
        m.Transform(to_3857)
        # Lakes are small: labels closer together than at sea.
        place_labels(m.GetPoints(), d, "novana", out, cfg["label_spacing"] / 3, cfg["label_half"] / 2)
    return n


# ---------------------------------------------------------------------------
# Steps (each cached in the workdir, so a long build can run step by step)
# ---------------------------------------------------------------------------

STEPS = (["grids"]
         + [f"{t}-{p}" for t in TIERS for p in ("areas", "lines", "emod")] + ["t1-sound", "lakes"]
         + [f"tiles-{t}" for t in TIERS] + ["join"])


class Build:
    def __init__(self, args):
        self.args = args
        self.work = args.work
        self.grids = os.path.join(self.work, "grids")
        self.vec = os.path.join(self.work, "vec")
        for d in (self.work, self.grids, self.vec):
            os.makedirs(d, exist_ok=True)
        self.raw_path = fetch(DDM_WEBLINK + urllib.parse.quote(DDM_FILE), os.path.join(self.work, DDM_FILE))
        self.date = time.strftime("%d.%m.%Y", time.localtime(os.path.getmtime(self.raw_path)))
        state = os.path.join(self.work, "state.json")
        if os.path.exists(state):
            prev = json.load(open(state))
            if prev["bbox"] != args.bbox:
                raise SystemExit(f"{self.work} was built with bbox {prev['bbox']}; use another workdir")
            # Grids and emod vectors are cached: builds with and without EMODnet must not share them.
            if prev.get("no_emodnet", False) != args.no_emodnet:
                raise SystemExit(f"{self.work} was built with no_emodnet={prev.get('no_emodnet', False)}; "
                                 "use another workdir")
        else:
            digest = sha256(self.raw_path)
            if digest != DDM_SHA256:
                log(f"WARNING: {DDM_FILE} has sha256 {digest}, not the 2024 v2.0 file; a new model version?")
            json.dump({"bbox": args.bbox, "no_emodnet": args.no_emodnet, "ddm_sha256": digest, "ddm_date": self.date}, open(state, "w"))

    def bbox_ll(self):
        if not self.args.bbox:
            return None
        ring = ogr.Geometry(ogr.wkbLinearRing)
        x0, y0, x1, y1 = self.args.bbox
        for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)):
            lon, lat, _ = TO_4326.TransformPoint(x, y)
            ring.AddPoint_2D(lon, lat)
        g = ogr.Geometry(ogr.wkbPolygon)
        g.AddGeometry(ring)
        return g

    def grid(self, name):
        return os.path.join(self.grids, name + ".tif")

    def step_grids(self):
        raw, gt = load_ddm(self.raw_path, self.args.bbox)
        valid = np.isfinite(raw)
        log(f"DDM {raw.shape[1]}x{raw.shape[0]} cells, {valid.sum() * 0.0025:.0f} km² water")
        write_grid(self.grid("raw"), raw, gt)
        write_grid(self.grid("sound"), blur(raw, 1.0), gt)
        filled = fill_coast(raw, FILL_CELLS)
        lines_base = np.where(ndimage.binary_dilation(valid, iterations=1), filled, np.nan)
        for name, cfg in TIERS.items():
            if name == "t3":
                f = cfg["out_cell"] // 50
                base, base_lines, cell = block_mean(filled, f), block_mean(lines_base, f), cfg["out_cell"]
            else:
                base, base_lines, cell = filled, lines_base, 50
            sm = blur(base, cfg["blur"] / cell)
            pa = write_grid(self.grid(f"{name}_areas"), sm, gt, cell)
            sm[~np.isfinite(base_lines)] = np.nan
            pl = write_grid(self.grid(f"{name}_lines"), sm, gt, cell)
            del sm
            if cfg["out_cell"] < cell:
                for p in (pa, pl):
                    tmp = p.replace(".tif", "_50.tif")
                    os.replace(p, tmp)
                    gdal.Warp(p, tmp, xRes=cfg["out_cell"], yRes=cfg["out_cell"], resampleAlg="cubicspline",
                              creationOptions=["COMPRESS=DEFLATE", "PREDICTOR=3", "TILED=YES", "BIGTIFF=YES"])
                    os.remove(tmp)
            log(f"grids {name} done")
        del filled, lines_base
        if not self.args.no_emodnet:
            emod, egt = load_emodnet(self.work, gt, raw.shape, valid)
            for name, cfg in TIERS.items():
                e_base, e_cell = (block_mean(emod, 4), 400) if name == "t3" else (emod, 100)
                write_grid(self.grid(f"{name}_emod"), blur(e_base, max(1.0, cfg["blur"] / e_cell) * 1.5), egt, e_cell)

    def out(self, step):
        return os.path.join(self.vec, step.replace("-", "_") + ".geojsons")

    def run(self, step):
        if step == "grids":
            if os.path.exists(os.path.join(self.grids, ".done")) and not self.args.force:
                return
            self.step_grids()
            open(os.path.join(self.grids, ".done"), "w").close()
            return
        if step.startswith("tiles-"):
            return self.tiles(step[6:])
        if step == "join":
            return self.join()
        target = self.out(step)
        if os.path.exists(target) and not self.args.force:
            return
        seq = Seq(target + ".part")
        tier, _, part = step.partition("-")
        cfg = TIERS.get(tier)
        n = 0
        if part == "areas":
            _ds, lyr = contour(self.grid(f"{tier}_areas"), cfg["levels"], True)
            n = write_areas(lyr, cfg["levels"], cfg["min_area"], "ddm", seq)
        elif part == "lines":
            _ds, lyr = contour(self.grid(f"{tier}_lines"), cfg["levels"], False)
            n = write_lines(lyr, cfg["min_len"], "ddm", seq, seq, cfg["label_spacing"], cfg["label_half"])
        elif part == "emod":
            if not self.args.no_emodnet:
                lv, g = EMOD_LEVELS[tier], self.grid(f"{tier}_emod")
                _ds, lyr = contour(g, lv, True)
                n = write_areas(lyr, lv, max(cfg["min_area"], 200_000), "emodnet", seq)
                _ds, lyr = contour(g, lv, False)
                n += write_lines(lyr, max(cfg["min_len"], 2_000), "emodnet", seq, seq,
                                 cfg["label_spacing"] * 1.5, cfg["label_half"] * 1.5)
        elif part == "sound":
            raw_ds, sm_ds = gdal.Open(self.grid("raw")), gdal.Open(self.grid("sound"))
            raw = raw_ds.GetRasterBand(1).ReadAsArray()
            sm = sm_ds.GetRasterBand(1).ReadAsArray()
            n = write_soundings(raw, sm, raw_ds.GetGeoTransform(), cfg["sounding_block"], seq)
        elif step == "lakes":
            n = lakes(self.work, self.args.repo, self.bbox_ll(), seq)
        seq.close()
        os.replace(target + ".part", target)
        log(f"{step}: {n} features")

    def tiles(self, tier):
        z0, z1 = TIERS[tier]["zoom"]
        p = os.path.join(self.work, f"{tier}.pmtiles")
        if os.path.exists(p) and not self.args.force:
            return
        files = sorted(f for f in os.listdir(self.vec) if f.startswith(tier + "_") and f.endswith(".geojsons"))
        if tier != "t3":
            files.append("lakes.geojsons")
        cmd = ["tippecanoe", "-q", "-o", p + ".part.pmtiles", "--force", f"-Z{z0}", f"-z{z1}",
               "--detect-shared-borders", "--no-tiny-polygon-reduction", "--simplification=4",
               "-r1", "--no-feature-limit", "--no-tile-size-limit", "--buffer=16",
               "-P"]
        # Each file holds one tier's areas, lines, labels (or all three for emod/lakes); split by geometry.
        # The split is redone on every tiles run (cheap), so it can never lag behind the vectors.
        layers = {"Polygon": "depth_areas", "LineString": "depth_contours", "Point": "depth_labels"}
        for f in files:
            splits = {geom: os.path.join(self.vec, f"split_{tier}_{layer}_{f}") for geom, layer in layers.items()}
            outs = {geom: open(path, "w", encoding="utf-8") for geom, path in splits.items()}
            with open(os.path.join(self.vec, f), encoding="utf-8") as src:
                for line in src:
                    t = json.loads(line)["geometry"]["type"].replace("Multi", "")
                    if t in outs:
                        outs[t].write(line)
            for o in outs.values():
                o.close()
            cmd += [arg for geom, layer in layers.items() for arg in ("-L", f"{layer}:{splits[geom]}")]
        subprocess.run(cmd, check=True)
        os.replace(p + ".part.pmtiles", p)
        log(f"tiles {tier}: {os.path.getsize(p) / 1e6:.1f} MB")

    def join(self):
        out = os.path.join(self.work, self.args.out)
        parts = [os.path.join(self.work, f"{t}.pmtiles") for t in TIERS]
        subprocess.run(["tile-join", "-q", "-f", "-o", out, "--no-tile-size-limit",
                        "-n", "Dybder (Danmarks Dybdemodel, EMODnet, NOVANA)",
                        "-A", ATTRIBUTION.format(date=self.date), *parts], check=True)
        log(f"DONE {out}: {os.path.getsize(out) / 1e6:.1f} MB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work")
    ap.add_argument("steps", nargs="*", help=f"default: all ({', '.join(STEPS)})")
    ap.add_argument("--repo", default="/repo")
    ap.add_argument("--bbox", nargs=4, type=float, help="EPSG:3034 x0 y0 x1 y1, for test runs")
    ap.add_argument("--out", default="soekort.pmtiles")
    ap.add_argument("--no-emodnet", action="store_true")
    ap.add_argument("--force", action="store_true", help="redo the given steps even if cached")
    args = ap.parse_args()
    b = Build(args)
    for step in args.steps or STEPS:
        if step not in STEPS:
            raise SystemExit(f"unknown step {step}")
        t = time.time()
        b.run(step)
        log(f"step {step}: {time.time() - t:.0f} s")


if __name__ == "__main__":
    sys.exit(main())
