import json, math, sys
d = json.load(open(sys.argv[1]))
geom = [f['geometry'] for f in d['features'] if f['properties'].get('ADM0_A3') == 'DNK'][0]
polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
Z = 17
N = 2 ** Z
def proj(lon, lat):
    x = (lon + 180) / 360 * N
    y = (1 - math.log(math.tan(math.pi/4 + math.radians(lat)/2)) / math.pi) / 2 * N
    return x, y
edges = []
area_km2 = 0
for poly in polys:
    for ring in poly:
        pts = [proj(lo, la) for lo, la in ring]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            if y0 != y1:
                edges.append((x0, y0, x1, y1))
print("polygoner", len(polys), "kanter", len(edges), file=sys.stderr)
rows = {}
for x0, y0, x1, y1 in edges:
    lo, hi = (y0, y1) if y0 < y1 else (y1, y0)
    for sub in (0.25, 0.5, 0.75):
        r0 = math.ceil(lo - sub); r1 = math.floor(hi - sub)
        for r in range(r0, r1 + 1):
            y = r + sub
            if lo <= y < hi:
                x = x0 + (y - y0) * (x1 - x0) / (y1 - y0)
                rows.setdefault((r, sub), []).append(x)
cells = set()
for (r, sub), xs in rows.items():
    xs.sort()
    for a, b in zip(xs[0::2], xs[1::2]):
        for c in range(int(math.floor(a)), int(math.floor(b)) + 1):
            cells.add((c, r))
print("z17-celler", len(cells), file=sys.stderr)
out = {}
for z in range(17, 5, -1):
    k = 17 - z
    out[z] = len({(c >> k, r >> k) for c, r in cells})
# landareal (overflade af celler centreret) som kontrol: z17 celle ved 56N
cell_km = 40075.016 / N * math.cos(math.radians(56))
print(json.dumps(out))
print("kontrol: z17-celler * celleareal =", round(len(cells) * cell_km**2), "km2 (inkl. kystceller)", file=sys.stderr)
