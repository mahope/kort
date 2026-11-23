#!/usr/bin/env node
// data/stednavne.tsv.gz -> GeoJSONSeq for tippecanoe (one point per name).
// Each feature gets a tippecanoe minzoom from its "size" (log2 of the bbox
// diagonal in metres), so big names (Limfjorden, Rold Skov) appear early and
// small ones (a farm, a burial mound) only at zoom 14+.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const [input = "data/stednavne.tsv.gz", output = "stednavne.geojsons"] = process.argv.slice(2);
const lines = gunzipSync(readFileSync(input)).toString("utf8").split("\n");
const hoved = lines[0].split("\t").slice(1);
const under = lines[1].split("\t").slice(1);
const out = [];
for (const line of lines.slice(3)) {
  if (!line) continue;
  const [navn, h, u, , lng, lat, size, prim] = line.split("\t");
  if (prim !== "1") continue; // secondary spellings are search aliases, not labels
  const s = Number(size);
  // size 14 (~16 km diagonal) -> z8, size 8 (~256 m) -> z14
  const minzoom = Math.max(6, Math.min(14, 22 - s));
  out.push(JSON.stringify({
    type: "Feature",
    tippecanoe: { minzoom },
    properties: { navn, type: hoved[Number(h)], undertype: under[Number(u)], size: s },
    geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
  }));
}
writeFileSync(output, out.join("\n") + "\n");
console.log(`${out.length} features -> ${output}`);
