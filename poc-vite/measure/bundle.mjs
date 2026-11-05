// Bundle size per target: first-load JS from a real network log + all emitted JS.
// usage: node bundle.mjs <out.json>   (serves the sourcemap builds, strips map comments)
import fs from "node:fs";
import path from "node:path";
import { targets, launch, sleep } from "./lib.mjs";
import { shares, strip, gz } from "./attribute.mjs";

const T = targets({ maps: true });
const result = {};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

for (const [label, t] of Object.entries(T)) {
  const stop = await t.start();
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const loaded = new Map();
    page.on("response", async (r) => {
      const u = new URL(r.url());
      if (u.hostname !== "127.0.0.1") return;
      if (!u.pathname.endsWith(".js")) return;
      try { loaded.set(u.pathname, await r.body()); } catch {}
    });
    await page.goto(t.url, { waitUntil: "networkidle" });
    await sleep(3000);
    const cats = {};
    const add = (c, raw, g) => { cats[c] ??= { raw: 0, gz: 0 }; cats[c].raw += raw; cats[c].gz += g; };
    let fl = { raw: 0, gz: 0, n: 0 };
    const files = [];
    for (const [p, body] of loaded) {
      const b = strip(body);
      const g = gz(b);
      fl.raw += b.length; fl.gz += g; fl.n++;
      const local = path.join(t.dist, p.slice(t.urlBase.length));
      const sh = shares(local);
      const tot = Object.values(sh).reduce((a, b) => a + b, 0) || 1;
      for (const [c, n] of Object.entries(sh)) add(c, n * b.length / tot, g * n / tot);
      files.push({ p, raw: b.length, gz: g });
    }
    // all emitted client JS (incl. lazy chunks never fetched on load)
    const all = walk(t.dist).filter((f) => f.endsWith(".js") && !f.includes("/_buildManifest"));
    let ar = 0, ag = 0;
    const allCats = {};
    for (const f of all) {
      const b = strip(fs.readFileSync(f)); const g = gz(b); ar += b.length; ag += g;
      const sh = shares(f); const tot = Object.values(sh).reduce((a, b) => a + b, 0) || 1;
      for (const [c, n] of Object.entries(sh)) { allCats[c] ??= { raw: 0, gz: 0 }; allCats[c].raw += n * b.length / tot; allCats[c].gz += g * n / tot; }
    }
    const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { raw: Math.round(v.raw), gz: Math.round(v.gz) }]));
    result[label] = { firstLoad: fl, firstLoadByCategory: round(cats), firstLoadFiles: files, allEmitted: { files: all.length, raw: ar, gz: ag }, allEmittedByCategory: round(allCats) };
  } finally { await browser.close(); stop(); }
}
fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2));
for (const [l, r] of Object.entries(result)) console.log(l, "first-load", r.firstLoad, "all", r.allEmitted);
