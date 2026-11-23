#!/usr/bin/env python3
"""Extrapolate measured per-zoom tile sizes to all of Denmark.

Tile counts per zoom are the land-touching tiles from PR #60
(docs/research/dtk25-pmtiles/dk-tilecounts.json); z18 is 4 x z17 (estimate).
Mean bytes per zoom come from zoomstats.txt of each sample; zooms the sample
does not cover use the lowest measured zoom's mean (few tiles, small effect).
Range: x0.47 (farmland) to x1.3 (town), the spread PR #60 measured between its
three areas at z16, relative to the overall mean that this Silkeborg sample matches.
"""
import json, sys, re
counts = {int(k): v for k, v in json.load(open(sys.argv[1])).items()}
counts[18] = counts[17] * 4
def read(path, name):
    cur, out = None, {}
    for line in open(path):
        if line.startswith("#"): cur = line[2:].strip(); continue
        if cur == name and re.match(r"^\d+ ", line):
            z, n, tot, mean, med = map(int, line.split()); out[z] = mean
    return out
rows = [  # label, zoomstats file, mbtiles name, minzoom, maxzoom
    ("DTK25 JPEG q75", "dtk25", "dtk25-jpeg-q75.mbtiles", 6, 16),
    ("DTK25 JPEG q85", "dtk25", "dtk25-jpeg-q85.mbtiles", 6, 16),
    ("DTK25 JPEG q90", "dtk25", "dtk25-jpeg-q90.mbtiles", 6, 16),
    ("DTK25 WebP q85", "dtk25", "dtk25-webp-q85.mbtiles", 6, 16),
    ("DTK25 WebP q85, lanczos overviews", "dtk25-lanczos", "dtk25l-webp-q85.mbtiles", 6, 16),
    ("DTK25 PNG8", "dtk25", "dtk25-png8-q0.mbtiles", 6, 16),
    ("DTK25 PNG", "dtk25", "dtk25-png-q0.mbtiles", 6, 16),
    ("Høje Målebordsblade JPEG q85", "hoeje", "hoeje-jpeg-q85.mbtiles", 6, 16),
    ("Høje Målebordsblade WebP q85", "hoeje", "hoeje-webp-q85.mbtiles", 6, 16),
    ("Høje Målebordsblade JPEG q85, z6-15", "hoeje", "hoeje-jpeg-q85.mbtiles", 6, 15),
    ("Høje Målebordsblade WebP q85, z6-15", "hoeje", "hoeje-webp-q85.mbtiles", 6, 15),
    ("Lave Målebordsblade JPEG q85", "lave", "lave-jpeg-q85.mbtiles", 6, 16),
    ("Lave Målebordsblade WebP q85", "lave", "lave-webp-q85.mbtiles", 6, 16),
    ("Lave Målebordsblade WebP q85, z6-15", "lave", "lave-webp-q85.mbtiles", 6, 15),
    ("Hillshade (own, gdaldem) WebP q80", "hillshade", "hillshade-webp-q80.mbtiles", 6, 16),
    ("Hillshade (own, gdaldem) JPEG q80", "hillshade", "hillshade-jpeg-q80.mbtiles", 6, 16),
    ("Hillshade (own) WebP q80, z6-15", "hillshade", "hillshade-webp-q80.mbtiles", 6, 15),
    ("Hillshade (KDS WMS) WebP q80", "skygge-wms", "skygge-webp-q80.mbtiles", 6, 16),
    ("Ortofoto JPEG q80, z6-17", "orto", "orto-jpeg-q80.mbtiles", 6, 17),
    ("Ortofoto JPEG q90, z6-17", "orto", "orto-jpeg-q90.mbtiles", 6, 17),
    ("Ortofoto JPEG q80, z6-18", "orto", "orto-jpeg-q80.mbtiles", 6, 18),
    ("Ortofoto JPEG q90, z6-18", "orto", "orto-jpeg-q90.mbtiles", 6, 18),
    ("Ortofoto WebP q80, z6-18", "orto", "orto-webp-q80.mbtiles", 6, 18),
]
base = sys.argv[2]
print("| Layer and variant | Zooms | Tiles (DK) | z16 KB/tile | Size DK, GB (range) |")
print("| --- | --- | --- | --- | --- |")
for label, d, name, z0, z1 in rows:
    means = read(f"{base}/{d}/zoomstats.txt", name)
    lo = min(means)
    total = sum(counts[z] * means.get(z, means[lo]) for z in range(z0, z1 + 1))
    tiles = sum(counts[z] for z in range(z0, z1 + 1))
    gb = total / 1e9
    print(f"| {label} | {z0}-{z1} | {tiles:,} | {means.get(16, 0) / 1000:.1f} | **{gb:.1f}** ({gb * 0.47:.1f}-{gb * 1.3:.1f}) |")
