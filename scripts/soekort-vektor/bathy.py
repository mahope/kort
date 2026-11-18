"""Prepare the depth raster and pick depth soundings for the vector sea chart.

    python3 bathy.py <depth.tif> <land.tif> <out-depth.tif> <out-soundings.geojsons>

<depth.tif> is the merged elevation model (metres, negative below sea level) on a
50 m grid in EPSG:3035. <land.tif> is the same grid with OSM land burnt in as 1.

1. Water by OSM's coastline that the coarse model calls land (a model cell straddles
   the coast) gets -0.5 m, so the 0-1 m band reaches the drawn coastline instead of
   leaving a white seam. Land is left as is; the land polygons cover it on the map.
2. Soundings: a coarse-to-fine set of blocks (6.4 km down to 400 m). Each block gets
   one depth: a shoal if the block hides one, else a deep hole, else the depth
   closest to the block's median. A finer tier skips blocks that already hold a
   coarser sounding, and each point carries the zoom it appears from.
"""

import json
import sys

import numpy as np
from osgeo import gdal, osr

gdal.UseExceptions()

SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")
# (minzoom, block size in metres). Zoom 13 is about 1:25.000 in a 150 dpi PDF.
TIERS = [(9, 6400), (10, 3200), (11, 1600), (12, 800), (13, 400)]
MIN_DEPTH = 0.3  # shallower is beach or noise
COAST_PX = 2  # keep soundings this many cells (100 m) off the coast


def label(depth: float) -> str:
    """Chart style: whole metres, then tenths as a subscript below 21 m. Rounded down."""
    tenths = int(depth * 10)
    whole, frac = divmod(tenths, 10)
    if whole >= 21:
        return str(whole)
    return f"{whole}{str(frac).translate(SUB)}"


def erode(mask: np.ndarray, r: int) -> np.ndarray:
    """True only where every cell within r cells (square) is True."""
    out = mask.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy == 0 and dx == 0:
                continue
            shifted = np.zeros_like(mask)
            ys = slice(max(dy, 0), mask.shape[0] + min(dy, 0))
            yd = slice(max(-dy, 0), mask.shape[0] + min(-dy, 0))
            xs = slice(max(dx, 0), mask.shape[1] + min(dx, 0))
            xd = slice(max(-dx, 0), mask.shape[1] + min(-dx, 0))
            shifted[yd, xd] = mask[ys, xs]
            out &= shifted
    return out


def main() -> None:
    src_path, land_path, out_path, snd_path = sys.argv[1:5]
    src = gdal.Open(src_path)
    elev = src.GetRasterBand(1).ReadAsArray().astype(np.float32)
    nodata = src.GetRasterBand(1).GetNoDataValue()
    land_ds = gdal.Open(land_path)
    land = land_ds.GetRasterBand(1).ReadAsArray().astype(bool)
    if nodata is not None:
        elev[elev == nodata] = np.nan

    water = ~land
    # Sea by OSM but land (or nothing) by the model: a shallow fringe.
    fix = water & ~(elev < -0.05)
    elev[fix] = -0.5
    print(f"kystkant rettet: {fix.sum()} celler", flush=True)

    drv = gdal.GetDriverByName("GTiff")
    out = drv.Create(out_path, src.RasterXSize, src.RasterYSize, 1, gdal.GDT_Float32,
                     ["COMPRESS=DEFLATE", "TILED=YES", "PREDICTOR=3", "BIGTIFF=YES"])
    out.SetGeoTransform(src.GetGeoTransform())
    out.SetProjection(src.GetProjection())
    band = out.GetRasterBand(1)
    band.SetNoDataValue(-32768)
    band.WriteArray(np.where(np.isnan(elev), -32768, elev))
    out = None

    depth = -elev
    ok = erode(water, COAST_PX) & (depth >= MIN_DEPTH) & ~np.isnan(depth)
    depth = np.where(ok, depth, np.nan)

    gt = src.GetGeoTransform()
    cell = gt[1]
    srs = osr.SpatialReference()
    srs.ImportFromWkt(src.GetProjection())
    wgs = osr.SpatialReference()
    wgs.ImportFromEPSG(4326)
    wgs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    to_wgs = osr.CoordinateTransformation(srs, wgs)

    occupied = np.zeros(depth.shape, dtype=bool)
    count = 0
    with open(snd_path, "w") as f:
        for minzoom, size in TIERS:
            k = int(round(size / cell))
            h, w = (depth.shape[0] // k) * k, (depth.shape[1] // k) * k
            blocks = depth[:h, :w].reshape(h // k, k, w // k, k).transpose(0, 2, 1, 3).reshape(h // k, w // k, k * k)
            occ = occupied[:h, :w].reshape(h // k, k, w // k, k).any(axis=(1, 3))
            valid = (~np.isnan(blocks)).sum(axis=2)
            use = (valid >= k * k * 0.25) & ~occ
            by, bx = np.nonzero(use)
            sel = blocks[by, bx]
            with np.errstate(all="ignore"):
                med = np.nanmedian(sel, axis=1)
                mn = np.nanmin(sel, axis=1)
                mx = np.nanmax(sel, axis=1)
            imin = np.nanargmin(sel, axis=1)
            imax = np.nanargmax(sel, axis=1)
            imed = np.nanargmin(np.abs(sel - med[:, None]), axis=1)
            shoal = (mn < 0.7 * med) & (med - mn > 1)
            hole = ~shoal & (mx > 1.4 * med) & (mx - med > 2)
            pick = np.where(shoal, imin, np.where(hole, imax, imed))
            py = by * k + pick // k
            px = bx * k + pick % k
            vals = depth[py, px]
            occupied[py, px] = True
            for y, x, d in zip(py.tolist(), px.tolist(), vals.tolist()):
                gx = gt[0] + (x + 0.5) * gt[1]
                gy = gt[3] + (y + 0.5) * gt[5]
                lon, lat, _ = to_wgs.TransformPoint(gx, gy)
                feat = {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]},
                    "properties": {"d": int(d * 10) / 10, "t": label(d)},
                    "tippecanoe": {"minzoom": minzoom},
                }
                f.write(json.dumps(feat, ensure_ascii=False) + "\n")
            count += len(vals)
            print(f"dybdetal zoom {minzoom} ({size} m): {len(vals)}", flush=True)
    print(f"dybdetal i alt: {count}")


if __name__ == "__main__":
    main()
