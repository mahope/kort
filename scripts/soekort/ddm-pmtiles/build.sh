#!/bin/bash
# Build soekort.pmtiles (depth bands, contours, labels) from Danmarks Dybdemodel,
# EMODnet and NOVANA. See README.md in this folder.
#
#   build.sh [workdir] [--bbox x0 y0 x1 y1]   (bbox in EPSG:3034, for test runs)
#
# Downloads are cached in the workdir, so a rerun only rebuilds.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
W=${1:-$HOME/dev/soekort-ddm/work}
shift || true
mkdir -p "$W"
docker build -q -t kort-ddm "$HERE" > /dev/null
start=$(date +%s)
docker run --rm -u "$(id -u):$(id -g)" \
  -v "$W:/work" -v "$REPO:/repo:ro" -v "$HERE:/scripts:ro" \
  -w /work kort-ddm python3 /scripts/build.py /work --repo /repo "$@"
echo "byggetid: $(( $(date +%s) - start )) s"
# A single step (e.g. grids) may not have written any PMTiles yet.
find "$W" -maxdepth 1 -name '*.pmtiles' -exec ls -la {} +
