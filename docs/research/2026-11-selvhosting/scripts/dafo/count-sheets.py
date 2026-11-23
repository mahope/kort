#!/usr/bin/env python3
"""Count raster sheets per dataset by asking GetRasterMultipleSize for the interior of each grid cell.
200 = a sheet exists, 404 = none. Key from env DAFO_KEY (never printed).
Usage: count-sheets.py <register> <dataset> <cell_m> <x0> <y0> <x1> <y1> > cells.tsv"""
import os, sys, time, urllib.request, urllib.parse, urllib.error

KEY = os.environ["DAFO_KEY"]
reg, ds, cell = sys.argv[1], sys.argv[2], int(sys.argv[3])
x0, y0, x1, y1 = map(int, sys.argv[4:8])
n = 0
for x in range(x0, x1, cell):
    for y in range(y0, y1, cell):
        q = urllib.parse.urlencode(dict(minx=x + 100, miny=y + 100, maxx=x + cell - 100, maxy=y + cell - 100,
                                        register=reg, version=1, datasetname=ds))
        url = f"https://api.datafordeler.dk/FileDownloads/GetRasterMultipleSize?{q}&apiKey={urllib.parse.quote(KEY)}"
        try:
            body = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kort.mahoje.dk research #39"}),
                                          timeout=60).read().decode()
            print(f"{x}\t{y}\t{body.split(' / ')[0]}", flush=True); n += 1
        except urllib.error.HTTPError as e:
            if e.code != 404:
                print(f"{x}\t{y}\tHTTP {e.code}", flush=True)
        except Exception as e:
            print(f"{x}\t{y}\tERROR {type(e).__name__}", flush=True)
        time.sleep(0.1)
print(f"# {reg} {ds} cell {cell} m: {n} cells with data", file=sys.stderr)
