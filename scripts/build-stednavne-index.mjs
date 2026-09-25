#!/usr/bin/env node
// Builds data/stednavne.tsv.gz — the compact place-name index served by
// /api/stednavne.
//
// Why a snapshot: DAWA (incl. stednavne2) closes 1 Oct 2026, Gsearch is on
// KDS' closure list without a replacement yet, and Datafordeler's DS GraphQL
// only supports exact-match filters (no prefix search). The Danske Stednavne
// register itself has not been updated since September 2025, so a snapshot
// is as current as any live service.
//
// Input: a full stednavne2 dump in DAWA JSON format, e.g.
//   curl --compressed https://api.dataforsyningen.dk/stednavne2 -o stednavne2.json
// Usage:
//   node scripts/build-stednavne-index.mjs <stednavne2.json> [data/stednavne.tsv.gz]
//
// Output format (UTF-8 TSV, gzipped):
//   line 1: "#hovedtyper" \t <name> \t <name> ...
//   line 2: "#undertyper" \t ...
//   line 3: "#kommuner"   \t ...
//   rows:   navn \t hovedtypeIdx \t undertypeIdx \t kommuneIdx|"" \t lng \t lat \t size \t primær(1|0)
// size = log2 of the bbox diagonal in metres (0–20), a notability proxy used
// to rank e.g. Rold Skov (Rebild) above a small wood of the same name.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { gzipSync } from "node:zlib";

const [input, output = "data/stednavne.tsv.gz"] = process.argv.slice(2);
if (!input) {
  console.error("Usage: node scripts/build-stednavne-index.mjs <stednavne2.json> [out]");
  process.exit(1);
}

const rows = JSON.parse(readFileSync(input, "utf8"));
if (!Array.isArray(rows) || rows.length < 100000) {
  // Guard against publishing a truncated/partial dump.
  console.error(`Expected a full dump (>100k names), got ${rows?.length}`);
  process.exit(1);
}

const tables = { hovedtyper: [], undertyper: [], kommuner: [] };
const indexOf = (table, value) => {
  const list = tables[table];
  let i = list.indexOf(value);
  if (i === -1) {
    list.push(value);
    i = list.length - 1;
  }
  return i;
};

const clean = (s) => String(s).replace(/[\t\r\n]+/g, " ").trim();

function sizeBucket(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return 0;
  const [x1, y1, x2, y2] = bbox;
  const midLat = ((y1 + y2) / 2) * (Math.PI / 180);
  const dx = (x2 - x1) * 111320 * Math.cos(midLat);
  const dy = (y2 - y1) * 110540;
  const diag = Math.hypot(dx, dy);
  return Math.max(0, Math.min(20, Math.round(Math.log2(diag + 1))));
}

const lines = [];
let skipped = 0;
for (const r of rows) {
  const sted = r.sted;
  const c = sted?.visueltcenter;
  if (!r.navn || !Array.isArray(c) || c.length !== 2) {
    skipped++;
    continue;
  }
  const kommune = sted.kommuner?.[0]?.navn;
  lines.push(
    [
      clean(r.navn),
      indexOf("hovedtyper", sted.hovedtype ?? ""),
      indexOf("undertyper", sted.undertype ?? ""),
      kommune ? indexOf("kommuner", clean(kommune)) : "",
      c[0].toFixed(5),
      c[1].toFixed(5),
      sizeBucket(sted.bbox),
      r.brugsprioritet === "primær" ? 1 : 0,
    ].join("\t")
  );
}

const header = [
  ["#hovedtyper", ...tables.hovedtyper].join("\t"),
  ["#undertyper", ...tables.undertyper].join("\t"),
  ["#kommuner", ...tables.kommuner].join("\t"),
];
const tsv = [...header, ...lines].join("\n") + "\n";
const gz = gzipSync(Buffer.from(tsv, "utf8"), { level: 9 });
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, gz);
console.log(
  `Wrote ${output}: ${lines.length} names (${skipped} skipped), ` +
    `${(tsv.length / 1e6).toFixed(1)} MB raw, ${(gz.length / 1e6).toFixed(1)} MB gz`
);
