import json, os, sys, collections, statistics, subprocess, sqlite3

W = sys.argv[1]
rows = [json.loads(l) for l in open(os.path.join(W, "fetch-log.jsonl"))]
rows = [r for r in rows if "bytes" in r]
# stikprøver: kun én post pr. (area,z,x,y,fmt)
seen = {}
for r in rows:
    seen[(r["area"], r["z"], r["x"], r["y"], r["fmt"])] = r
rows = list(seen.values())

# WebP via ffmpeg (q75) fra PNG (tabsfri kilde)
webp = {}
for r in rows:
    if r["fmt"] != "png":
        continue
    src = os.path.join(W, r["area"], str(r["z"]), str(r["x"]), f'{r["y"]}.png')
    dst = os.path.join(W, r["area"], str(r["z"]), str(r["x"]), f'{r["y"]}.webp')
    if not os.path.exists(dst):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-c:v", "libwebp", "-quality", "75", dst], check=True)
    webp[(r["area"], r["z"], r["x"], r["y"])] = os.path.getsize(dst)

# tomme/ensfarvede fliser: JPEG under 1,5 KB regnes som (næsten) tom
by = collections.defaultdict(list)
for r in rows:
    by[(r["area"], r["z"], r["fmt"])].append(r["bytes"])
byz = collections.defaultdict(lambda: collections.defaultdict(list))
for r in rows:
    byz[r["z"]][r["fmt"]].append(r["bytes"])
for k, v in webp.items():
    byz[k[1]]["webp"].append(v)

print("## Gns. bytes pr. flise pr. zoom (alle 3 områder)")
print("z | fliser | jpg gns | jpg median | png gns | webp q75 gns")
for z in sorted(byz):
    d = byz[z]
    print(z, len(d["jpg"]), round(statistics.mean(d["jpg"])), round(statistics.median(d["jpg"])),
          round(statistics.mean(d["png"])), round(statistics.mean(d["webp"])))

print("\n## Pr. område: jpg gns pr. flise")
areas = sorted({r["area"] for r in rows})
print("z | " + " | ".join(areas))
for z in sorted(byz):
    print(z, *[round(statistics.mean(by[(a, z, "jpg")])) if by.get((a, z, "jpg")) else "-" for a in areas], sep=" | ")

print("\n## Svartid ms (jpg, png)")
for f in ("jpg", "png"):
    ms = sorted(r["ms"] for r in rows if r["fmt"] == f)
    print(f, "n", len(ms), "median", ms[len(ms)//2], "p95", ms[int(len(ms)*.95)], "max", ms[-1])
print("fejl i log:", sum(1 for l in open(os.path.join(W, "fetch-log.jsonl")) if '"err"' in l))
