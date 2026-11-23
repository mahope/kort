#!/usr/bin/env python3
"""Sum per-municipality vs national file sizes in a DHMHoejdekurver listing. Usage: kurve-sum.py <json>"""
import collections, json, sys

d = json.load(open(sys.argv[1]))["availableFileDownloads"]
mun = collections.defaultdict(int); nat = {}; n = collections.Counter()
for x in d:
    if x["containedFileFormat"] != "gpkg":
        continue
    if x["municipalityCode"] is None:
        nat[x["entityName"]] = x["fileSizeInBytes"]
    else:
        mun[x["entityName"]] += x["fileSizeInBytes"]; n[x["entityName"]] += 1
for e in sorted(nat):
    print(f"{e}: national {nat[e] / 1e9:.2f} GB, sum of {n[e]} municipalities {mun[e] / 1e9:.2f} GB")
