// Before/after screenshots of the vector sea chart ("Søkort" base map) and PDF crops
// at 1:25.000 and 1:50.000 (docs/screenshots/soekort-vektor). "Før" is the sea chart
// as it was: DTK25 with Dybdemodellen, wrecks, lake depths and lake charts on top.
// Uses an existing Playwright installation and poppler's pdftoppm; installs nothing.
//
//   NEXT_PUBLIC_SOEKORT_URL=<pmtiles url> npm run build
//   KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-soekort-vektor.mjs
import { spawn, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const { chromium } = await import(process.env.KORT_PLAYWRIGHT_MODULE || "playwright");
const port = 6000 + Math.floor(Math.random() * 1000);
const base = `http://localhost:${port}`;
const OUT = "docs/screenshots/soekort-vektor";
const BEFORE = "l=dtk&ov=dd-80,vr-100,sd-100,ik-100";
const AFTER = "l=so";

// Same view before and after; `pdf` prints the "after" view at a scale and crops it.
const AREAS = [
  { name: "loegstoer", c: "56.97000,9.25000,12.3", pdf: { s: 25000, crop: [0.1, 0.12, 0.55, 0.5] } },
  { name: "isefjorden", c: "55.82000,11.83000,11.2", pdf: { s: 50000, crop: [0.1, 0.12, 0.55, 0.5] } },
  { name: "smaalandsfarvandet", c: "55.05000,11.55000,10.6", pdf: { s: 50000, crop: [0.2, 0.2, 0.55, 0.5] } },
  { name: "mossoe", c: "56.04000,9.79000,12.8" },
];

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
let serverOutput = "";
server.stdout.on("data", (c) => (serverOutput += c));
server.stderr.on("data", (c) => (serverOutput += c));
const tmp = await mkdtemp(path.join(tmpdir(), "soekort-vektor-"));
let browser;

async function open(context, q) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/?${q}`, { waitUntil: "domcontentloaded" });
  await page.locator(".maplibregl-canvas").waitFor();
  await page.getByTestId("sea-badge").waitFor();
  await page.waitForTimeout(9000);
  return { page, errors };
}

try {
  for (let i = 0; i < 150; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 200));
    if (i === 149) throw new Error("Local server did not become ready");
  }
  browser = await chromium.launch({ headless: true });
  await mkdir(OUT, { recursive: true });
  for (const a of AREAS) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, colorScheme: "light" });
    for (const [label, layers] of [["foer", BEFORE], ["efter", AFTER]]) {
      const { page, errors } = await open(context, `c=${a.c}&${layers}&s=25000&f=A4&o=l&d=150`);
      await page.screenshot({ path: `${OUT}/${a.name}-${label}.png` });
      assert.deepEqual(errors, [], `${a.name} ${label}: page errors`);
      await page.close();
    }
    if (a.pdf) {
      const { page, errors } = await open(context, `c=${a.c}&${AFTER}&s=${a.pdf.s}&f=A4&o=l&d=150`);
      const download = page.waitForEvent("download", { timeout: 240000 });
      await page.getByRole("button", { name: /Download PDF/ }).first().click();
      const file = path.join(tmp, `${a.name}.pdf`);
      await (await download).saveAs(file);
      const info = execFileSync("pdfinfo", [file]).toString();
      const [pw, ph] = /Page size:\s+([\d.]+) x ([\d.]+)/.exec(info).slice(1).map((n) => (Number(n) / 72) * 200);
      const [fx, fy, fw, fh] = a.pdf.crop;
      const tag = `${a.name}-pdf-1-${a.pdf.s / 1000}k`;
      execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-r", "200", "-png", "-singlefile",
        "-x", String(Math.round(pw * fx)), "-y", String(Math.round(ph * fy)), "-W", String(Math.round(pw * fw)), "-H", String(Math.round(ph * fh)),
        file, `${OUT}/${tag}-udsnit`]);
      // Top left of the page: the credit box with the warning and every source.
      execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-r", "150", "-png", "-singlefile",
        "-x", "0", "-y", "0", "-W", String(Math.round((pw * 150) / 200 * 0.75)), "-H", String(Math.round((ph * 150) / 200 * 0.3)),
        file, `${OUT}/${tag}-kreditering`]);
      execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-r", "60", "-png", "-singlefile", file, `${OUT}/${tag}-side`]);
      assert.deepEqual(errors, [], `${a.name} pdf: page errors`);
      await page.close();
    }
    console.log(`${a.name}: ok`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const page = await context.newPage();
  await page.goto(`${base}/kilder`, { waitUntil: "networkidle" });
  await page.locator("#soekort").screenshot({ path: `${OUT}/kilder-soekort.png` });
  await context.close();
} finally {
  await browser?.close();
  server.kill();
  await rm(tmp, { recursive: true, force: true });
}
