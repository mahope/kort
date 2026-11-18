# GDAL + tippecanoe + osmium for the vector sea chart (build-soekort-tiles.sh).
# Pinned (tag and digest) so a rebuild gives the same tiles; tippecanoe and osmium
# come from this image's Ubuntu release. Bump on purpose and compare the output.
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.13.3@sha256:64250faf833c06d4b21afce4c27190039ba7ab58d70f0eebc87cf77d929c0b40
RUN apt-get update && apt-get install -y --no-install-recommends \
      tippecanoe osmium-tool python3-numpy curl ca-certificates unzip \
    && rm -rf /var/lib/apt/lists/*
