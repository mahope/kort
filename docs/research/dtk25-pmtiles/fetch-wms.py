import math, os, sys, time, urllib.request, urllib.error, json

TOKEN = "fd44f26ab5701c01ca9f570e507fe9ab"  # appens offentlige token (src/lib/map/styles.ts)
OUT = sys.argv[1]
AREAS = {
    "hilleroed": (55.927, 12.300),
    "koebenhavn": (55.6761, 12.5683),
    "land-midtjylland": (56.30, 9.30),
}
HALF_KM = 1.0
ZOOMS = range(10, 17)
DELAY = 0.8
R = 6378137.0
ORIGIN = math.pi * R


def merc(lat, lon):
    return (math.radians(lon) * R, math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * R)


def tiles_for(lat, lon, z):
    dlat = HALF_KM / 111.32
    dlon = HALF_KM / (111.32 * math.cos(math.radians(lat)))
    x0, y0 = merc(lat - dlat, lon - dlon)
    x1, y1 = merc(lat + dlat, lon + dlon)
    n = 2 ** z
    size = 2 * ORIGIN / n
    tx0 = int((x0 + ORIGIN) // size)
    tx1 = int((x1 + ORIGIN) // size)
    ty0 = int((ORIGIN - y1) // size)
    ty1 = int((ORIGIN - y0) // size)
    return [(x, y) for x in range(tx0, tx1 + 1) for y in range(ty0, ty1 + 1)], size


def bbox(z, x, y):
    size = 2 * ORIGIN / 2 ** z
    minx = -ORIGIN + x * size
    maxy = ORIGIN - y * size
    return f"{minx},{maxy - size},{minx + size},{maxy}"


log = open(os.path.join(OUT, "fetch-log.jsonl"), "a")
n = 0
for area, (lat, lon) in AREAS.items():
    for z in ZOOMS:
        tl, _ = tiles_for(lat, lon, z)
        for x, y in tl:
            for fmt, ext in (("image/jpeg", "jpg"), ("image/png", "png")):
                p = os.path.join(OUT, area, str(z), str(x))
                os.makedirs(p, exist_ok=True)
                f = os.path.join(p, f"{y}.{ext}")
                if os.path.exists(f):
                    continue
                url = (
                    "https://api.dataforsyningen.dk/dtk_25_DAF?service=WMS&version=1.1.1&request=GetMap"
                    f"&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&LAYERS=DTK25&STYLES=default&TRANSPARENT=FALSE"
                    f"&FORMAT={fmt}&token={TOKEN}&BBOX={bbox(z, x, y)}"
                )
                req = urllib.request.Request(url, headers={"User-Agent": "kort.mahoje.dk-poc39 (research; contact mads@mahoje.dk)"})
                t = time.time()
                try:
                    with urllib.request.urlopen(req, timeout=30) as r:
                        data = r.read()
                        code = r.status
                        ct = r.headers.get("content-type")
                except urllib.error.HTTPError as e:
                    print("HTTP", e.code, area, z, x, y, flush=True)
                    log.write(json.dumps({"area": area, "z": z, "x": x, "y": y, "fmt": ext, "err": e.code}) + "\n")
                    if e.code in (403, 429):
                        sys.exit(2)
                    continue
                dt = time.time() - t
                if not (ct or "").startswith("image/"):
                    print("ikke billede:", ct, data[:200], flush=True)
                    sys.exit(3)
                open(f, "wb").write(data)
                log.write(json.dumps({"area": area, "z": z, "x": x, "y": y, "fmt": ext, "bytes": len(data), "ms": round(dt * 1000), "code": code}) + "\n")
                log.flush()
                n += 1
                time.sleep(DELAY)
print("hentet", n, flush=True)
