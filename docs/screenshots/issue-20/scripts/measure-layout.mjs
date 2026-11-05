import { createRequire } from "module";
import fs from "fs";
const require = createRequire("/home/mads/dev/data/audit-2026-11-05/tools/");
const { chromium } = require("playwright");
const AxeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const [base, label, shotDir] = process.argv.slice(2);
fs.mkdirSync(shotDir, { recursive: true });
const b = await chromium.launch();
const HANDLE = "aside [data-sheet-handle], .fixed.bottom-0 > div.cursor-grab";
const newPage = async (w, h, mobile = true) => {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto(base, { waitUntil: "load" });
  await p.waitForSelector(".maplibregl-ctrl-zoom-in", { timeout: 20000 });
  await p.waitForTimeout(1200);
  return [c, p];
};
const sheetPct = (p) => p.evaluate(() => { const s = document.querySelector("aside"); return Math.round(s.getBoundingClientRect().height / innerHeight * 100); });
const setPos = async (p, pos) => {
  const hb = await p.locator(HANDLE).first().boundingBox();
  const x = hb.x + hb.width / 2, y = hb.y + hb.height / 2;
  if (pos === "min") await p.mouse.click(x, y);
  if (pos === "max") { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x, y - 100, { steps: 4 }); await p.mouse.move(x, 2, { steps: 8 }); await p.mouse.up(); }
  await p.waitForTimeout(500);
};
const res = {};

// 1. rotation
res.rotation = [];
for (const pos of ["min", "mid", "max"]) {
  const [c, p] = await newPage(360, 740);
  if (pos !== "mid") await setPos(p, pos);
  const before = await sheetPct(p);
  await p.setViewportSize({ width: 740, height: 360 }); await p.waitForTimeout(600);
  const landscape = await sheetPct(p);
  const mapVisible = await p.evaluate(() => Math.round((innerHeight - document.querySelector("aside").getBoundingClientRect().height) / innerHeight * 100));
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(600);
  const back = await sheetPct(p);
  res.rotation.push({ pos, portrait: before, landscape, mapVisibleLandscape: mapVisible, back });
  if (pos === "mid") { await p.setViewportSize({ width: 740, height: 360 }); await p.waitForTimeout(600); await p.screenshot({ path: `${shotDir}/${label}-740x360-after-rotation.jpg`, type: "jpeg", quality: 75 }); }
  await c.close();
}
{ // direct landscape start
  const [c, p] = await newPage(740, 360);
  res.landscapeStart = await sheetPct(p);
  await p.screenshot({ path: `${shotDir}/${label}-740x360-landscape-start.jpg`, type: "jpeg", quality: 75 });
  await c.close();
}

// 2. layout shifts + SSR
{
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  await p.addInitScript(() => { window.__shifts = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shifts.push({ v: e.value, recent: e.hadRecentInput, src: (e.sources || []).map((s) => (s.node && s.node.nodeName) + "." + ((s.node && s.node.className) || "").toString().slice(0, 40)) }); }).observe({ type: "layout-shift", buffered: true }); });
  await p.goto(base, { waitUntil: "load" }); await p.waitForTimeout(2500);
  res.shifts = await p.evaluate(() => window.__shifts);
  await c.close();
  const html = await (await fetch(base + "/", { headers: { "user-agent": "Mozilla/5.0 (iPhone)" } })).text();
  res.ssr = { hasAsideSheet: /<aside[^>]*aria-label="Kortindstillinger"/.test(html), hasHandle: html.includes("data-sheet-handle"), hasDownload: /Download PDF/.test(html) };
}

// 3. axe region at 390x844
res.axe = [];
for (const pos of ["mid", "min", "max"]) {
  const [c, p] = await newPage(390, 844);
  if (pos !== "mid") await setPos(p, pos);
  await p.evaluate(AxeSource);
  const r = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } })).violations.map((v) => ({ id: v.id, n: v.nodes.length })));
  res.axe.push({ pos, region: r.filter((v) => v.id === "region").reduce((a, v) => a + v.n, 0), all: r });
  await c.close();
}

// 4. overflow sweep + targets
res.sweep = [];
for (const [w, h, mobile] of [[320, 568, true], [360, 740, true], [390, 844, true], [430, 932, true], [600, 900, true], [768, 1024, true], [844, 390, true], [1024, 768, false], [1440, 900, false]]) {
  const [c, p] = await newPage(w, h, mobile);
  for (const adv of [false, true]) {
    if (adv) { const btn = p.getByRole("button", { name: /Avancerede indstillinger/ }); if (await btn.count()) { await btn.first().click(); await p.waitForTimeout(400); } }
    const r = await p.evaluate(() => {
      const sc = document.querySelector("aside [data-sheet-scroll]");
      const small = [];
      const coarse = matchMedia("(pointer: coarse)").matches;
      for (const el of document.querySelectorAll("aside a, aside button, aside [role=radio]")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.height < 44 || r.width < 44) small.push(((el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 22)) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      const theme = [...document.querySelectorAll('[aria-label="Farvetema"] button')].map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; });
      const aside = document.querySelector("aside");
      const dl = [...document.querySelectorAll("aside button")].find((x) => /Download/.test(x.textContent));
      const d = dl && dl.getBoundingClientRect();
      return { coarse, asideSW: aside.scrollWidth, asideCW: aside.clientWidth, scSW: sc.scrollWidth, scCW: sc.clientWidth, asideW: Math.round(aside.getBoundingClientRect().width), theme, small, downloadVisible: !!d && d.top >= 0 && d.bottom <= innerHeight };
    });
    res.sweep.push({ vp: `${w}x${h}`, adv, ...r });
  }
  if ([320, 768, 1440].includes(w) || w === 844) await p.screenshot({ path: `${shotDir}/${label}-${w}x${h}-sidebar.jpg`, type: "jpeg", quality: 75 });
  await c.close();
}
await b.close();
fs.writeFileSync(`${shotDir}/../${label}-layout.json`, JSON.stringify(res, null, 1));
console.log("ROTATION", JSON.stringify(res.rotation), "landscapeStart", res.landscapeStart);
console.log("SHIFTS", JSON.stringify(res.shifts));
console.log("SSR", JSON.stringify(res.ssr));
console.log("AXE", JSON.stringify(res.axe));
for (const s of res.sweep) console.log("SWEEP", s.vp, s.adv ? "adv" : "   ", "coarse", s.coarse, `aside ${s.asideSW}/${s.asideCW} sc ${s.scSW}/${s.scCW}`, "w", s.asideW, "theme", JSON.stringify(s.theme), "dl", s.downloadVisible, "small", s.small.length, s.small.slice(0, 6).join("|"));
