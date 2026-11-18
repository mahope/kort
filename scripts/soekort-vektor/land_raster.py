"""Burn the OSM land polygons into the depth model's 50 m grid (1 = land).

    python3 land_raster.py <elev.tif> <land.gpkg> <out.tif>
"""

import sys

from osgeo import gdal

gdal.UseExceptions()

elev_path, land_path, out_path = sys.argv[1:4]
src = gdal.Open(elev_path)
gt = src.GetGeoTransform()
bounds = [gt[0], gt[3] + gt[5] * src.RasterYSize, gt[0] + gt[1] * src.RasterXSize, gt[3]]
gdal.Rasterize(
    out_path,
    land_path,
    format="GTiff",
    outputType=gdal.GDT_Byte,
    outputSRS=src.GetProjection(),
    outputBounds=bounds,
    xRes=gt[1],
    yRes=-gt[5],
    burnValues=[1],
    initValues=[0],
    allTouched=False,
    creationOptions=["COMPRESS=DEFLATE", "TILED=YES"],
)
print("land.tif skrevet")
