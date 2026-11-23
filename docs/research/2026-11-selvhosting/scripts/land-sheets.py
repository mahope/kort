#!/usr/bin/env python3
"""Which 20 x 20 km raster sheets touch land?

  land-sheets.py mask <terrain.tsv> <cells.tsv>... [--points utm.txt]   sheets per file with and without land
  land-sheets.py list <terrain.tsv> <cells.tsv> [--points utm.txt]      the land sheets as "x y", for the build
  land-sheets.py points <stednavne.tsv.gz> > lonlat.txt        land-type names as "lon lat" (cross-check)
  gdaltransform -s_srs EPSG:4326 -t_srs EPSG:25832 < lonlat.txt > utm.txt
  land-sheets.py cells <utm.txt> <cells.tsv>...                the same count with the place-name proxy

The land mask is the DHM terrain model: terrain.tsv is `count-sheets.py dhm Terraen 20000 …`, and a
20 km cell holds land when it has at least one 1 km terrain tile (the model covers all Danish land and
nothing else). That catches a coast strip without a place name, which the place-name proxy (a sheet
with at least one name of a land type) misses; on 23 Nov it missed 3 land sheets. `--points` adds
the proxy's sheets on top; on 23 Nov that only added 2 offshore wind farms (Anholt, Kriegers Flak),
which are sea. cells.tsv is the output of the sheet count (x, y, size
per 20 km cell); every line must carry a size, so a failed request cannot pass as a sheet.
"""
import gzip, re, sys

WATER = {"Farvand", "Urentfarvand", "Havnebassin", "Navigationsanlaeg"}
CELL = 20000


def read_cells(path):
    cells = []
    for line in open(path):
        if line.startswith("#") or not line.strip():
            continue
        f = line.rstrip("\n").split("\t")
        if len(f) < 3 or not re.fullmatch(r"\d+(\.\d+)? [KMG]?B", f[2]):
            sys.exit(f"{path}: not a sheet-count line: {line.strip()!r}")
        cells.append((int(f[0]), int(f[1])))
    return cells


if sys.argv[1] == "points":
    lines = gzip.open(sys.argv[2], "rt", encoding="utf-8").read().split("\n")
    hoved = lines[0].split("\t")[1:]
    for line in lines[3:]:
        if not line:
            continue
        f = line.split("\t")
        if hoved[int(f[1])] not in WATER:
            print(f[4], f[5])
    sys.exit(0)

def read_points(path):
    out = set()
    for line in open(path):
        x, y = map(float, line.split()[:2])
        out.add((int(x // CELL) * CELL, int(y // CELL) * CELL))
    return out


args = sys.argv[1:]
extra = set()
if "--points" in args:  # mask/list: also keep sheets with a land-type place name (reefs, lighthouses)
    i = args.index("--points"); extra = read_points(args[i + 1]); del args[i:i + 2]
sys.argv[1:] = args
if sys.argv[1] in ("mask", "list"):
    land = set(read_cells(sys.argv[2])) | extra
else:
    land = read_points(sys.argv[2])
if sys.argv[1] == "list":
    for c in read_cells(sys.argv[3]):
        if c in land:
            print(*c)
    sys.exit(0)
for path in sys.argv[3:]:
    cells = read_cells(path)
    n = sum(1 for c in cells if c in land)
    print(f"{path.rsplit('/', 1)[-1]}: {len(cells)} sheets, {n} touch land, {len(cells) - n} sea only")
