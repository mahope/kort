#!/usr/bin/env python3
"""Which 20 x 20 km raster sheets touch land? Uses the place-name snapshot as a land proxy.

  land-sheets.py points <stednavne.tsv.gz> > lonlat.txt        land-type names as "lon lat"
  gdaltransform -s_srs EPSG:4326 -t_srs EPSG:25832 < lonlat.txt > utm.txt
  land-sheets.py cells <utm.txt> <cells.tsv>...                 sheets per file with and without land

A sheet counts as land when it holds at least one name of a land type (not sea, fjord, harbour or
undersea ground). cells.tsv is the output of the sheet count (x, y, size per 20 km cell).
"""
import gzip, sys

WATER = {"Farvand", "Urentfarvand", "Havnebassin", "Navigationsanlaeg"}
CELL = 20000

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

land = set()
for line in open(sys.argv[2]):
    x, y = map(float, line.split()[:2])
    land.add((int(x // CELL) * CELL, int(y // CELL) * CELL))
for path in sys.argv[3:]:
    cells = [tuple(map(int, l.split("\t")[:2])) for l in open(path) if not l.startswith("#")]
    n = sum(1 for c in cells if c in land)
    print(f"{path.rsplit('/', 1)[-1]}: {len(cells)} sheets, {n} touch land, {len(cells) - n} sea only")
