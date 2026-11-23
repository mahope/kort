# GDAL, tippecanoe and SciPy for the depth tiles. The GDAL image is pinned; the
# other tools come from the image's own Ubuntu 26.04 archive.
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.13.2
RUN apt-get update \
 && apt-get install -y --no-install-recommends tippecanoe python3-scipy curl ca-certificates poppler-utils \
 && rm -rf /var/lib/apt/lists/*
