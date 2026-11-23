#!/usr/bin/env python3
"""Fetch one terrain chunk from Datafordeler's dhm_wcs with the key (DAFO_KEY, never printed).
Usage: wcs-probe.py <out.tif> <x> <y> <size_m> <px> [coverage]"""
import os, sys, time, urllib.error, urllib.parse, urllib.request

KEY = os.environ["DAFO_KEY"]
out, x, y, size, px = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
cov = sys.argv[6] if len(sys.argv) > 6 else "dhm_terraen"
base = "https://wcs.datafordeler.dk/DHMNedboer/dhm_wcs/1.0.0/WCS"
q = urllib.parse.urlencode(dict(service="WCS", version="1.0.0", request="GetCoverage", coverage=cov,
                                crs="EPSG:25832", format="GTiff", bbox=f"{x},{y},{x + size},{y + size}",
                                width=px, height=px))
url = f"{base}?{q}&apikey={urllib.parse.quote(KEY)}"
t = time.time()
try:
    r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kort.mahoje.dk research #39"}), timeout=600)
    data = r.read()
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code} {e.read()[:300]!r}".replace(KEY, "***")); sys.exit(1)
ok = data[:4] in (b"II*\0", b"MM\0*")
print(f"{'GeoTIFF' if ok else 'NOT a GeoTIFF'} {len(data)} B {time.time() - t:.1f} s")
if not ok:
    print(data[:400].decode("utf-8", "replace").replace(KEY, "***")); sys.exit(1)
open(out, "wb").write(data)
