// Sample images of the depth style, from the local preview page (serve.mjs).
// Uses an existing Playwright installation; installs nothing.
//
//   PMTILES=~/dev/soekort-ddm/work/soekort.pmtiles \
//   KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
//   node scripts/soekort/ddm-pmtiles/preview/capture.mjs [case ...]
//
// Writes WebP files to docs/research/2026-11-egen-soekortstil/ (OUT to override).
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITES } from "./sites.mjs";
import { toWebp } from "./webp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || path.resolve(HERE, "../../../../docs/research/2026-11-egen-soekortstil");
const { chromium } = await import(process.env.KORT_PLAYWRIGHT_MODULE || "playwright");
const port = 7300 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;

// One shot per site and mode; extra variant shots where the site asks for them.
const shots = [];
for (const s of SITES) {
  for (const variant of s.variants || ["klassisk"]) {
    shots.push({ site: s, mode: "screen", variant });
  }
  if (s.a4 !== false) shots.push({ site: s, mode: "a4", variant: "klassisk" });
}
const only = process.argv.slice(2);
const todo = only.length ? shots.filter((t) => only.some((o) => `${t.site.name}-${t.mode}-${t.variant}`.includes(o))) : shots;

const server = spawn(process.execPath, [path.join(HERE, "serve.mjs"), String(port)], { stdio: ["ignore", "pipe", "inherit"], env: process.env });
let browser;
const failed = [];
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${base}/style.mjs`)).ok) break; } catch {}
    if (i > 100) throw new Error("preview server did not start");
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
  await mkdir(OUT, { recursive: true });
  for (const t of todo) {
    const { site, mode, variant } = t;
    const viewport = mode === "a4" ? { width: 2480, height: 3508 } : { width: 1440, height: 900 };
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const q = new URLSearchParams({ lat: site.lat, lng: site.lng, scale: mode === "a4" ? site.scale : site.screenScale || site.scale, variant, mode, title: site.title });
    const started = Date.now();
    await page.goto(`${base}/?${q}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
    const errors = await page.evaluate(() => window.__errors);
    if (errors.length) {
      // A failed tile leaves holes: keep the old image rather than overwrite it with an incomplete one.
      console.error(`${site.name}-${mode}-${variant}: NOT SAVED, ${errors.length} map errors: ${errors.slice(0, 3).join(" | ")}`);
      failed.push(`${site.name}-${mode}-${variant}`);
      await context.close();
      continue;
    }
    const png = await page.screenshot({ type: "png" });
    const file = path.join(OUT, `${site.name}-egen-${variant}-${mode === "a4" ? "a4-300dpi" : "skaerm"}.webp`);
    await writeFile(file, await toWebp(browser, png, mode === "a4" ? 0.8 : 0.86));
    if (mode === "a4") {
      // 100 % crop (1400 x 900 px = 119 x 76 mm on paper) around the map centre, to judge the print detail.
      const [cx, cy] = [1240 + (site.crop?.[0] || 0), 118 + 1565 + (site.crop?.[1] || 0)];
      await writeFile(file.replace(".webp", "-udsnit.webp"), await toWebp(browser, png, 0.86, { clip: [cx - 700, cy - 450, 1400, 900] }));
    }
    console.log(`${path.basename(file)} (zoom ${(await page.evaluate(() => window.__zoom)).toFixed(2)}, ${Date.now() - started} ms)`);
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
if (failed.length) {
  console.error(`${failed.length} shots not saved (rerun them by name): ${failed.join(" ")}`);
  process.exitCode = 1;
}
