#!/usr/bin/env python3
"""Count raster sheets per dataset by asking GetRasterMultipleSize for the interior of each grid cell.
200 = a sheet exists, 404 = none. Key from env DAFO_KEY (never printed).
Usage: count-sheets.py <register> <dataset> <cell_m> <x0> <y0> <x1> <y1> > cells.tsv
stdout only gets cells that answered 200. Other answers (429, 5xx, timeouts) are retried; a cell
that still fails goes to stderr and the exit status is 1, so a partial list is never used as complete."""
import os, sys, time, urllib.request, urllib.parse, urllib.error

KEY = os.environ["DAFO_KEY"]
reg, ds, cell = sys.argv[1], sys.argv[2], int(sys.argv[3])
x0, y0, x1, y1 = map(int, sys.argv[4:8])


def ask(x, y):
    """Size string for a cell, None for 404; raises after the last retry."""
    q = urllib.parse.urlencode(dict(minx=x + 100, miny=y + 100, maxx=x + cell - 100, maxy=y + cell - 100,
                                    register=reg, version=1, datasetname=ds))
    url = f"https://api.datafordeler.dk/FileDownloads/GetRasterMultipleSize?{q}&apiKey={urllib.parse.quote(KEY)}"
    for attempt in range(5):
        try:
            body = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kort.mahoje.dk research #39"}),
                                          timeout=60).read().decode()
            return body.split(" / ")[0]
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            err = f"HTTP {e.code}"
        except Exception as e:
            err = f"ERROR {type(e).__name__}"
        time.sleep(5 * 2 ** attempt)
    raise RuntimeError(err)


n = failed = 0
for x in range(x0, x1, cell):
    for y in range(y0, y1, cell):
        try:
            size = ask(x, y)
        except RuntimeError as e:
            print(f"# FAILED {x} {y}: {e}", file=sys.stderr); failed += 1
            continue
        if size is not None:
            print(f"{x}\t{y}\t{size}", flush=True); n += 1
        time.sleep(0.1)
print(f"# {reg} {ds} cell {cell} m: {n} cells with data, {failed} failed", file=sys.stderr)
sys.exit(1 if failed else 0)
