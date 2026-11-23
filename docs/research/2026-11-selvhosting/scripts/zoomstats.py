#!/usr/bin/env python3
"""Per-zoom tile count and size of one or more MBTiles files."""
import sqlite3, sys
for path in sys.argv[1:]:
    db = sqlite3.connect(path)
    print(f"# {path.rsplit('/', 1)[-1]}")
    print("zoom tiles total_B mean_B median_B")
    for z, in db.execute("select distinct zoom_level from tiles order by 1"):
        sizes = sorted(r[0] for r in db.execute("select length(tile_data) from tiles where zoom_level=?", (z,)))
        print(z, len(sizes), sum(sizes), sum(sizes) // len(sizes), sizes[len(sizes) // 2])
