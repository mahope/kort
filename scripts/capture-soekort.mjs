// Screenshots of the lake and sea layers, on screen and as PDF crops (docs/screenshots/soekort-runde2).
// Uses an existing Playwright installation and poppler's pdftoppm; installs nothing.
// npm run build && KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-soekort.mjs
import { spawn, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const { chromium } = await import(process.env.KORT_PLAYWRIGHT_MODULE || "playwright");
const port = 6000 + Math.floor(Math.random() * 1000);
const base = `http://localhost:${port}`;
const OUT = "docs/screenshots/soekort-runde2";

const CASES = [
  // Mossø i Rold Skov: NOVANA depth contours and Thorkild Høy's chart from 1981 as an extra page.
  { name: "mosso-rold-skov", q: "c=56.80760,9.88620,16.2&l=dtk&s=5000&f=A4&o=p&d=150&ov=sd-100,ik-100", pages: 2, crop: [0.25, 0.3, 0.5, 0.35] },
  // Tjele Langsø at 1:25.000: depth contours with numbers over DTK25.
  { name: "tjele-langsoe", q: "c=56.53900,9.65300,13.6&l=dtk&s=25000&f=A4&o=l&d=150&ov=sd-100,ik-100", minPages: 2, crop: [0.2, 0.25, 0.6, 0.5] },
  // Øresund off Helsingør at 1:50.000: Dybdemodellen, sømærker and wrecks.
  { name: "oeresund-kyst", q: "c=56.05000,12.64000,12.6&l=dtk&s=50000&f=A4&o=l&d=150&ov=dd-80,sm-100,vr-100", pages: 1, crop: [0.0, 0.0, 0.6, 0.55] },
];

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
let serverOutput = "";
server.stdout.on("data", (c) => (serverOutput += c));
server.stderr.on("data", (c) => (serverOutput += c));
const tmp = await mkdtemp(path.join(tmpdir(), "soekort-"));
let browser;
try {
  for (let i = 0; i < 150; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 200));
    if (i === 149) throw new Error("Local server did not become ready");
  }
  browser = await chromium.launch({ headless: true });
  await mkdir(OUT, { recursive: true });
  for (const c of CASES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, colorScheme: "light" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/?${c.q}`, { waitUntil: "domcontentloaded" });
    await page.locator(".maplibregl-canvas").waitFor();
    await page.getByTestId("sea-badge").waitFor();
    await page.waitForTimeout(8000);
    await page.screenshot({ path: `${OUT}/${c.name}-skaerm.png` });

    const download = page.waitForEvent("download", { timeout: 240000 });
    await page.getByRole("button", { name: /Download PDF/ }).first().click();
    const file = path.join(tmp, `${c.name}.pdf`);
    await (await download).saveAs(file);
    const info = execFileSync("pdfinfo", [file]).toString();
    const pages = Number(/Pages:\s+(\d+)/.exec(info)[1]);
    if (c.pages) assert.equal(pages, c.pages, `${c.name}: pages`);
    if (c.minPages) assert.ok(pages >= c.minPages, `${c.name}: ${pages} pages`);

    // Crop of the map page at 200 dpi (fractions of the page: x, y, w, h).
    const [pw, ph] = /Page size:\s+([\d.]+) x ([\d.]+)/.exec(info).slice(1).map((n) => (Number(n) / 72) * 200);
    const [fx, fy, fw, fh] = c.crop;
    execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-r", "200", "-png", "-singlefile",
      "-x", String(Math.round(pw * fx)), "-y", String(Math.round(ph * fy)), "-W", String(Math.round(pw * fw)), "-H", String(Math.round(ph * fh)),
      file, `${OUT}/${c.name}-pdf-udsnit`]);
    // Top of the first page with the credit box and the warning.
    execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-r", "150", "-png", "-singlefile",
      "-x", "0", "-y", "0", "-W", String(Math.round((pw * 150) / 200 * 0.7)), "-H", String(Math.round((ph * 150) / 200 * 0.22)),
      file, `${OUT}/${c.name}-pdf-kreditering`]);
    if (pages > 1) execFileSync("pdftoppm", ["-f", "2", "-l", "2", "-r", "70", "-png", "-singlefile", file, `${OUT}/${c.name}-pdf-bilag`]);
    assert.deepEqual(errors, [], `${c.name}: page errors`);
    console.log(`${c.name}: ${pages} pages`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const page = await context.newPage();
  await page.goto(`${base}/kilder#hav`, { waitUntil: "networkidle" });
  await page.locator("section[aria-labelledby=hav]").screenshot({ path: `${OUT}/kilder-hav.png` });
  await page.locator("#soedybder").screenshot({ path: `${OUT}/kilder-soedybder.png` });
  await context.close();
} finally {
  await browser?.close();
  server.kill();
  await rm(tmp, { recursive: true, force: true });
}
