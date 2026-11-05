import { createRequire } from "module";
import fs from "fs";
const require = createRequire("/home/mads/dev/data/audit-2026-11-05/tools/");
const { chromium } = require("playwright");
const [base, label, shotDir] = process.argv.slice(2);
fs.mkdirSync(shotDir, { recursive: true });
const VPS = [[320, 568], [360, 740], [390, 844], [430, 932]];
const b = await chromium.launch();
const out = [];
const HANDLE = ".fixed.bottom-0 > div.cursor-grab, aside [data-sheet-handle]";

async function sheetH(p) {
  return p.evaluate(() => {
    const s = document.querySelector(".fixed.bottom-0.z-40, aside.fixed");
    return s ? Math.round(s.getBoundingClientRect().height) : null;
  });
}
async function setPos(p, pos, vh) {
  // reload gives mid; tap toggles min; drag to top gives max
  const h = await p.locator(HANDLE).first().boundingBox();
  const x = h.x + h.width / 2, y = h.y + h.height / 2;
  if (pos === "min") { await p.mouse.click(x, y); }
  if (pos === "max") { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x, y - 100, { steps: 4 }); await p.mouse.move(x, 2, { steps: 8 }); await p.mouse.up(); }
  await p.waitForTimeout(500);
}
async function probe(p) {
  return p.evaluate(() => {
    const covered = (el) => {
      if (!el) return "missing";
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      if (y > innerHeight || y < 0 || x > innerWidth) return "offscreen";
      const t = document.elementFromPoint(x, y);
      return !(t && (el.contains(t) || t.contains(el)));
    };
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y), b: Math.round(r.bottom) }; };
    const q = (s) => document.querySelector(s);
    const attrib = q(".maplibregl-ctrl-attrib-button") || q(".maplibregl-ctrl-attrib");
    const ctrls = { zoomIn: q(".maplibregl-ctrl-zoom-in"), zoomOut: q(".maplibregl-ctrl-zoom-out"), compass: q(".maplibregl-ctrl-compass"), attribution: attrib, gps: q('button[aria-label="Find min position"]') };
    const res = { controls: {}, gpsRect: rect(ctrls.gps) };
    for (const [k, el] of Object.entries(ctrls)) res.controls[k] = covered(el);
    const sheet = q(".fixed.bottom-0.z-40, aside.fixed");
    res.sheetH = sheet ? Math.round(sheet.getBoundingClientRect().height) : null;
    res.sheetPct = res.sheetH ? Math.round((res.sheetH / innerHeight) * 100) : null;
    const pb = [...document.querySelectorAll("button")].find((x) => /Download/i.test(x.textContent || ""));
    res.printBtn = rect(pb); res.footer = rect(pb && pb.closest("aside")?.lastElementChild);
    res.vh = innerHeight;
    return res;
  });
}
async function overlap(p, where) {
  return p.evaluate((where) => {
    const sc = [...document.querySelectorAll(".fixed.bottom-0 .overflow-y-auto, aside[class*=fixed] [data-sheet-scroll]")][0];
    if (!sc) return null;
    sc.scrollTop = where === "top" ? 0 : sc.scrollHeight;
    const sr = sc.getBoundingClientRect();
    const els = [...sc.querySelectorAll("a,button,input,select,textarea,summary")];
    let n = 0, cov = 0; const names = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      if (y < sr.top || y > sr.bottom || x < 0 || x > innerWidth) continue;
      n++;
      const t = document.elementFromPoint(x, y);
      if (!(t && (el.contains(t) || t.contains(el)))) { cov++; names.push((el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 25)); }
    }
    return { visible: n, covered: cov, names, scrollW: sc.scrollWidth, clientW: sc.clientWidth };
  }, where);
}
for (const [w, h] of VPS) {
  for (const pos of ["mid", "min", "max"]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const p = await c.newPage();
    await p.goto(base, { waitUntil: "load" });
    await p.waitForSelector(".maplibregl-ctrl-zoom-in", { timeout: 20000 });
    await p.waitForTimeout(1200);
    if (pos !== "mid") await setPos(p, pos, h);
    const r = await probe(p);
    r.vp = `${w}x${h}`; r.pos = pos;
    r.top = await overlap(p, "top"); r.bottom = await overlap(p, "bottom");
    if (pos === "mid" || (w === 320 && pos === "max")) {
      await p.evaluate(() => { for (const s of document.querySelectorAll(".overflow-y-auto")) s.scrollTop = 0; });
      await p.screenshot({ path: `${shotDir}/${label}-${w}x${h}-${pos}.jpg`, type: "jpeg", quality: 75 });
    }
    r.coveredCount = Object.values(r.controls).filter((v) => v === true).length;
    out.push(r);
    await c.close();
  }
}
await b.close();
fs.writeFileSync(`${shotDir}/../${label}-mobile.json`, JSON.stringify(out, null, 1));
for (const r of out) console.log(r.vp, r.pos, "sheet", r.sheetH, r.sheetPct + "%", "covered", r.coveredCount, JSON.stringify(r.controls), "gps", JSON.stringify(r.gpsRect), "print.b", r.printBtn?.b, "footer.b", r.footer?.b, "vh", r.vh, "ovTop", r.top?.covered, "ovBot", r.bottom?.covered, r.top?.names?.join("|"), "sw", r.top?.scrollW, r.top?.clientW);
