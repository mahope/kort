# GDAL + tippecanoe + osmium for the vector sea chart (build-soekort-tiles.sh).
FROM ghcr.io/osgeo/gdal:ubuntu-small-latest
RUN apt-get update && apt-get install -y --no-install-recommends \
      tippecanoe osmium-tool python3-numpy curl ca-certificates unzip \
    && rm -rf /var/lib/apt/lists/*
