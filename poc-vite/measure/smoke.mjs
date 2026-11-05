// Functional smoke + screenshots for both builds. usage: node smoke.mjs <out.json>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { targets, launch, sleep, REPO } from "./lib.mjs";

const T = targets({ maps: false });
const out = {};
const shotDir = process.env.SHOT_DIR || path.join(REPO, "docs/poc-vite");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kort-smoke-"));

for (const [label, t] of Object.entries(T)) {
  const stop = await t.start();
  const browser = await launch();
  const r = { errors: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => r.errors.push("pageerror: " + e.message.slice(0, 150)));
    page.on("console", (m) => { if (m.type() === "error") r.errors.push("console: " + m.text().slice(0, 150)); });

    // 1. map loads
    await page.goto(t.url, { waitUntil: "load" });
    await sleep(5000);
    r.mapCanvas = await page.locator("canvas.maplibregl-canvas").count();
    r.mapLoaded = await page.evaluate(() => !!document.querySelector(".maplibregl-canvas") && document.querySelector(".maplibregl-canvas").width > 100);
    await page.screenshot({ path: `${shotDir}/${label}-1440.png` });

    // 2. search
    r.stednavneApi = await page.evaluate(async () => { const x = await fetch("/api/stednavne?q=Himmelbjerget"); return { status: x.status, contentType: x.headers.get("content-type") }; });
    const input = page.locator("#search-input");
    r.searchInput = await input.count();
    for (const [name, q] of [["stednavn", "Himmelbjerget"], ["adresse", "Rådhuspladsen 1"]]) {
      await input.fill("");
      await input.fill(q);
      await sleep(2500);
      r["search_" + name] = { expanded: await input.getAttribute("aria-expanded"), options: await page.locator('[role="option"]').count() };
    }
    await input.fill("");

    // 3. MGRS grid via URL
    await page.goto(t.url + "?cs=mgrs&g=1", { waitUntil: "load" });
    await sleep(5000);
    const url = page.url();
    r.mgrs = { url, keptParams: /cs=mgrs/.test(url) && /g=1/.test(url), checkedBoxes: await page.locator('input[type="checkbox"]:checked').count() };
    await page.screenshot({ path: `${shotDir}/${label}-mgrs-1440.png` });

    // 4. PDF export A4 150 dpi
    // fresh context (no persisted grid state); Copenhagen so the PDF has content, not open sea
    const pc = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page2 = await pc.newPage();
    await page2.goto(t.url + "?c=55.67610%2C12.56830%2C12&d=150&f=A4&o=p", { waitUntil: "load" });
    await sleep(8000);
    r.pdfUrlState = page2.url();
    const t0 = Date.now();
    const [dl] = await Promise.all([
      page2.waitForEvent("download", { timeout: 120000 }),
      page2.getByRole("button", { name: /Download PDF/ }).click(),
    ]);
    const p = path.join(tmp, `${label}.pdf`);
    await dl.saveAs(p);
    r.pdf = { name: dl.suggestedFilename(), bytes: fs.statSync(p).size, ms: Date.now() - t0, header: fs.readFileSync(p).subarray(0, 5).toString() };

    // mobile screenshot
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const mp = await m.newPage();
    await mp.goto(t.url, { waitUntil: "load" });
    await sleep(5000);
    await mp.screenshot({ path: `${shotDir}/${label}-390.png` });
  } catch (e) { r.fatal = String(e.message).slice(0, 400); }
  finally { await browser.close(); stop(); }
  out[label] = r;
  console.log(label, JSON.stringify(r));
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
