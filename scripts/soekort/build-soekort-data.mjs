#!/usr/bin/env node
/**
 * Builds the three static sea/lake snapshots in public/data/soekort/:
 *
 *   soedybder.geojson   Lake depth contours (whole metres) from Danmarks Miljøportal's
 *                       "Dybdekort over danske søer (NOVANA)", WFS on geodata.fvm.dk.
 *   vrag.geojson        Wrecks around Denmark from EMODnet Human Activities
 *                       (worldwide wrecks, a UKHO subset), WFS.
 *   indsoekort.geojson  An index of Geodatastyrelsen's historical lake charts
 *                       (kortværk "Indsøkort", Thorkild Høy and others) with a point
 *                       per chart and the IIIF link to the scan, from arkivmeta.
 *
 * Snapshots instead of live calls: the files are small, print the same every time,
 * and the PDF does not depend on three outside servers. Re-run to refresh and
 * update RETRIEVED here and in src/constants/dataSources.ts.
 *
 * Usage: DATAFORSYNINGEN_TOKEN=... node scripts/soekort/build-soekort-data.mjs
 * (the free token is only needed for the indsøkort index; the other two are open).
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const RETRIEVED = new Date().toISOString().slice(0, 10);
const OUT = path.join("public", "data", "soekort");
const TOKEN = process.env.DATAFORSYNINGEN_TOKEN || process.env.NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN;

/** Denmark and the neighbouring waters a Danish trip can reach (lon/lat). */
const DK_BBOX = [7.5, 54.3, 15.8, 58.0];

async function getJson(url, decode = "utf-8") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url.replace(/token=[^&]+/, "token=…")}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return JSON.parse(new TextDecoder(decode).decode(buf));
}

const round = (n, d = 5) => Math.round(n * 10 ** d) / 10 ** d;

/** Douglas-Peucker on points in metres; keeps the first and last point. */
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-12;
    let maxD = 0;
    let maxI = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len;
      if (d > maxD) [maxD, maxI] = [d, i];
    }
    if (maxD > eps) {
      keep[maxI] = 1;
      stack.push([a, maxI], [maxI, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** A closed ring simplified in two halves (one pass would collapse it: first == last). */
function simplifyRing(ring, eps) {
  const k = 111320 * Math.cos((ring[0][1] * Math.PI) / 180);
  const m = ring.map(([x, y]) => [x * k, y * 111320]);
  const h = Math.floor(m.length / 2);
  const s = [...simplify(m.slice(0, h + 1), eps).slice(0, -1), ...simplify(m.slice(h), eps)];
  return s.map(([x, y]) => [round(x / k), round(y / 111320)]);
}

function collection(features, metadata) {
  return { type: "FeatureCollection", metadata: { ...metadata, retrieved: RETRIEVED }, features };
}

async function lakeDepths() {
  const url =
    "https://geodata.fvm.dk/geoserver/NOVANA/ows?service=WFS&version=2.0.0&request=GetFeature" +
    "&typeNames=NOVANA:Soe_dybdekort_konturer&outputFormat=application/json&srsName=EPSG:4326";
  // GeoServer sends this layer as ISO-8859-1 although it says JSON.
  const data = await getJson(url, "latin1");
  const features = [];
  for (const f of data.features) {
    if (!f.geometry) continue;
    // Each feature is a 0.5 m depth band; the outer ring of the band starting at a
    // whole metre is that metre's contour. 0 m is the shore, drawn by the base map.
    const d = f.properties.contourmin;
    if (!(d > 0) || !Number.isInteger(d)) continue;
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of polys) {
      const line = simplifyRing(poly[0], 1.5); // 1.5 m: 0.06 mm at 1:25.000
      if (line.length < 4) continue;
      features.push({ type: "Feature", properties: { d }, geometry: { type: "LineString", coordinates: line } });
    }
  }
  return collection(features, {
    name: "Dybdekort over danske søer (NOVANA), 0,5 m kontur",
    source: "Danmarks Miljøportal / Miljøstyrelsen (SGAV), geodata.fvm.dk WFS NOVANA:Soe_dybdekort_konturer",
    licence: "Vilkår for brug af danske offentlige data (Danmarks Miljøportal)",
  });
}

const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

async function wrecks() {
  const [w, s, e, n] = DK_BBOX;
  const url =
    "https://ows.emodnet-humanactivities.eu/wfs?service=WFS&version=1.1.0&request=GetFeature" +
    `&typeName=emodnet:wwshipwrecks&outputFormat=application/json&srsName=EPSG:4326&bbox=${w},${s},${e},${n},EPSG:4326`;
  const data = await getJson(url);
  const features = [];
  for (const f of data.features) {
    const p = f.properties;
    // Lifted, no longer found ("dead") or doubtful: nothing to find on the bottom.
    if (/lifted|dead|doubtful/.test(p.status)) continue;
    const [lon, lat] = f.geometry.coordinates;
    const props = {};
    if (p.name && p.name !== "n/a") props.n = titleCase(p.name.replace(/\s*\(POSSIBLY\)/i, "?")).replace(/ Or /g, " eller ");
    if (/^\d{8}$/.test(p.date_sunk)) props.y = Number(p.date_sunk.slice(0, 4));
    const depth = Number(p.depth);
    if (p.depth !== "n/a" && Number.isFinite(depth)) props.d = depth;
    features.push({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: [round(lon), round(lat)] } });
  }
  return collection(features, {
    name: "EMODnet Human Activities, Worldwide wrecks locations (UK Hydrographic Office)",
    source: "ows.emodnet-humanactivities.eu WFS emodnet:wwshipwrecks",
    licence: "CC BY 4.0 (EMODnet); UKHO-data under Open Government Licence v3.0",
  });
}

/**
 * Charts whose archive record sits on the wrong lake. "Mossø" (ID 6c2918dc) is a
 * second copy of the Rold Skov chart (is_110c, see is_110a) but has the outline of
 * Mossø by Skanderborg; checked against the scans 18/11-2026.
 */
const CHART_FIXES = {
  "6c2918dc-3d44-4592-bf76-bf2a7bf85ef2": { title: "Mossø (Rold Skov)", at: [9.8863, 56.8074] },
  "22c743fe-0193-4399-a010-0a60d3fc268f": { title: "Mossø (Rold Skov)" },
  "417a6a59-df31-4c42-a691-794651c1f739": { title: "Mossø (ved Skanderborg)" },
};

/** Area-weighted centroid of the largest polygon in a WKT MULTIPOLYGON/POLYGON. */
function centroid(wkt) {
  const rings = [...wkt.matchAll(/\(\(([^()]+)\)/g)].map((m) =>
    m[1].split(",").map((p) => p.trim().split(/\s+/).map(Number))
  );
  let best = null;
  for (const r of rings) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < r.length - 1; i++) {
      const c = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
      a += c;
      cx += (r[i][0] + r[i + 1][0]) * c;
      cy += (r[i][1] + r[i + 1][1]) * c;
    }
    if (a === 0) continue;
    if (!best || Math.abs(a) > Math.abs(best.a)) best = { a, x: cx / (3 * a), y: cy / (3 * a) };
  }
  return best ? [round(best.x), round(best.y)] : null;
}

async function lakeCharts() {
  if (!TOKEN) throw new Error("Set DATAFORSYNINGEN_TOKEN (free Dataforsyningen token) for the indsøkort index.");
  const url = `https://api.dataforsyningen.dk/rest/arkivmeta/v3/kort?kortvaerk=Inds%C3%B8kort&limit=1000&token=${TOKEN}`;
  const data = await getJson(url);
  const features = [];
  for (const k of data.kort) {
    const fix = CHART_FIXES[k.id] ?? {};
    const at = fix.at ?? (k.geometri ? centroid(k.geometri) : null);
    const file = k.filer?.[0];
    if (!at || !file) continue;
    const year = k.aarforudarbejdelse ?? k.aarforudgivelse ?? k.gaeldendeperiode_gaeldendefra ?? null;
    features.push({
      type: "Feature",
      properties: {
        id: k.id,
        t: fix.title ?? k.titel,
        ...(year ? { y: year } : {}),
        ...(k.tegner ? { a: k.tegner } : {}),
        ...(k.maalestok && k.maalestok !== "Ukendt" ? { m: k.maalestok } : {}),
        // IIIF image service; the client adds /full/<w>,/0/default.jpg and the token.
        f: file,
      },
      geometry: { type: "Point", coordinates: at },
    });
  }
  // Some surveys are in the archive twice (original and a later print): one marker each.
  const seen = new Set();
  const unique = features.filter(({ properties: p }) => {
    const key = `${p.t}|${p.a ?? ""}|${p.y ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => a.properties.t.localeCompare(b.properties.t, "da"));
  return collection(unique, {
    name: "Historiske indsøkort (kortværk Indsøkort)",
    source: "Geodatastyrelsen/Klimadatastyrelsen, historiskekort.dk via api.dataforsyningen.dk/rest/arkivmeta",
    licence: "CC BY 4.0",
    note: "Placering fra arkivets metadata (søens omrids), ikke georefereret. Rettelser i CHART_FIXES.",
  });
}

/** Sanity check: every chart point should be within a few km of a lake of the same name. */
async function checkCharts(fc) {
  const tsv = gunzipSync(await readFile(path.join("data", "stednavne.tsv.gz"))).toString("utf8").split("\n");
  const types = tsv[0].split("\t").slice(1);
  const lakeType = String(types.indexOf("Sø"));
  const lakes = new Map();
  for (const row of tsv.slice(3)) {
    const c = row.split("\t");
    if (c[1] !== lakeType) continue;
    const key = c[0].toLowerCase();
    if (!lakes.has(key)) lakes.set(key, []);
    lakes.get(key).push([Number(c[4]), Number(c[5])]);
  }
  const km = ([x1, y1], [x2, y2]) => Math.hypot((x1 - x2) * 62, (y1 - y2) * 111);
  for (const f of fc.features) {
    const names = f.properties.t.split(/,| og |\(|\)/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const near = names.flatMap((n) => lakes.get(n) ?? []).map((p) => km(p, f.geometry.coordinates));
    if (near.length && Math.min(...near) > 3) {
      console.warn(`  check: ${f.properties.t} is ${Math.min(...near).toFixed(1)} km from the nearest lake of that name`);
    }
  }
}

await mkdir(OUT, { recursive: true });
for (const [file, build] of [
  ["soedybder.geojson", lakeDepths],
  ["vrag.geojson", wrecks],
  ["indsoekort.geojson", lakeCharts],
]) {
  const fc = await build();
  if (file === "indsoekort.geojson") await checkCharts(fc);
  const json = JSON.stringify(fc);
  await writeFile(path.join(OUT, file), json + "\n");
  console.log(`${file}: ${fc.features.length} features, ${Math.round(json.length / 1024)} KB`);
}
