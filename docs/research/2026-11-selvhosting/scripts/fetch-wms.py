#!/usr/bin/env python3
"""Fetch a 10 x 10 km sample of a WMS layer as georeferenced chunks.

Usage: fetch-wms.py <outdir> <service> <layer> <res_m> <format> [x0 y0 x1 y1]

EPSG:25832, 2000 px chunks, one request at a time with a pause. Each chunk is
saved with a world file (.wld) so GDAL can mosaic it. Reads the app's public
Dataforsyningen token from DF_TOKEN (docs/tokens.md). Only for a small research sample:
bulk building should use the file downloads, not the WMS.
"""
import json, os, sys, time, urllib.request

TOKEN = os.environ["DF_TOKEN"]  # the public token from src/lib/map/styles.ts
UA = "kort.mahoje.dk research #39 (small sample)"
CHUNK = 2000

out, service, layer, res, fmt = sys.argv[1:6]
res = float(res)
x0, y0, x1, y1 = map(float, sys.argv[6:10]) if len(sys.argv) > 6 else (530000, 6220000, 540000, 6230000)
os.makedirs(out, exist_ok=True)
step = CHUNK * res
ext = "png" if "png" in fmt else "jpg"
log = open(os.path.join(out, "fetch-log.jsonl"), "a")
y = y0
while y < y1:
    x = x0
    while x < x1:
        w = min(CHUNK, round((x1 - x) / res)); h = min(CHUNK, round((y1 - y) / res))
        name = f"{int(x)}_{int(y)}"
        path = os.path.join(out, f"{name}.{ext}")
        if not os.path.exists(path):
            url = (f"https://api.dataforsyningen.dk/{service}?service=WMS&version=1.1.1&request=GetMap"
                   f"&SRS=EPSG:25832&LAYERS={layer}&STYLES=&FORMAT={fmt}&TRANSPARENT=FALSE"
                   f"&WIDTH={w}&HEIGHT={h}&BBOX={x},{y},{x + w * res},{y + h * res}&token={TOKEN}")
            t = time.time()
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://kort.mahoje.dk/"})
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read(); ctype = r.headers.get("Content-Type")
            ms = round((time.time() - t) * 1000)
            if not ctype.startswith("image/"):
                sys.exit(f"not an image for {name}: {ctype} {data[:300]!r}")
            open(path, "wb").write(data)
            # world file: pixel size, rotation, rotation, -pixel size, centre of upper-left pixel
            open(os.path.join(out, f"{name}.wld"), "w").write(
                f"{res}\n0\n0\n{-res}\n{x + res / 2}\n{y + h * res - res / 2}\n")
            log.write(json.dumps({"chunk": name, "bytes": len(data), "ms": ms, "w": w, "h": h}) + "\n"); log.flush()
            print(name, len(data), ms, flush=True)
            time.sleep(0.5)
        x += w * res
    y += h * res
