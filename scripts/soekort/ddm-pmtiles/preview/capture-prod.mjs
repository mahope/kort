// The same views from kort.mahoje.dk as it is today (Dybdemodel WMS + NOVANA
// lake lines over the skærmkort), for comparison: a screen shot and the first
// page of a real A4 PDF at 300 dpi from the app's own "Download PDF".
// Needs Docker with the kort-ddm image (pdftoppm) and an existing Playwright.
//
//   KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/soekort/ddm-pmtiles/preview/capture-prod.mjs [site ...]
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITES } from "./sites.mjs";
import { toWebp } from "./webp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || path.resolve(HERE, "../../../../docs/research/2026-11-egen-soekortstil");
const PROD = process.env.PROD || "https://kort.mahoje.dk";
const { chromium } = await import(process.env.KORT_PLAYWRIGHT_MODULE || "playwright");

/** Screen zoom (MapLibre, 512 px tiles) for a scale at 96 dpi, as the preview page uses. */
const screenZoom = (lat, scale) => Math.log2((Math.cos((lat * Math.PI) / 180) * 40075016.686) / (512 * ((scale * 0.0254) / 96)));

const only = process.argv.slice(2);
const sites = SITES.filter((s) => !only.length || only.includes(s.name));
const tmp = await mkdtemp(path.join(tmpdir(), "soekort-prod-"));
const browser = await chromium.launch({ headless: true });
try {
  for (const s of sites) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, colorScheme: "light" });
    const page = await context.newPage();
    const scale = s.screenScale || s.scale;
    const q = `c=${s.lat.toFixed(5)},${s.lng.toFixed(5)},${screenZoom(s.lat, scale).toFixed(1)}&l=sk&s=${s.scale}&f=A4&o=p&d=300&ov=dd-100,sd-100`;
    await page.goto(`${PROD}/?${q}`, { waitUntil: "domcontentloaded" });
    await page.locator(".maplibregl-canvas").waitFor();
    await page.waitForTimeout(9000);
    const png = await page.screenshot({ type: "png" });
    await writeFile(path.join(OUT, `${s.name}-prod-skaerm.webp`), await toWebp(browser, png, 0.86));
    if (s.a4 !== false) {
      const download = page.waitForEvent("download", { timeout: 300000 });
      await page.getByRole("button", { name: /Download PDF/ }).first().click();
      const pdf = path.join(tmp, `${s.name}.pdf`);
      await (await download).saveAs(pdf);
      execFileSync("docker", ["run", "--rm", "-u", `${process.getuid()}:${process.getgid()}`, "-v", `${tmp}:/t`, "kort-ddm",
        "pdftoppm", "-f", "1", "-l", "1", "-r", "300", "-png", "-singlefile", `/t/${s.name}.pdf`, `/t/${s.name}`]);
      const page1 = await readFile(path.join(tmp, `${s.name}.png`));
      const file = path.join(OUT, `${s.name}-prod-a4-300dpi.webp`);
      await writeFile(file, await toWebp(browser, page1, 0.8));
      // Same crop size as the preview's, around the page centre.
      const dims = await (async () => {
        const ctx = await browser.newContext();
        const p = await ctx.newPage();
        const d = await p.evaluate(async (b64) => {
          const i = new Image();
          i.src = `data:image/png;base64,${b64}`;
          await i.decode();
          return [i.width, i.height];
        }, page1.toString("base64"));
        await ctx.close();
        return d;
      })();
      await writeFile(file.replace(".webp", "-udsnit.webp"),
        await toWebp(browser, page1, 0.86, { clip: [dims[0] / 2 - 700, dims[1] / 2 - 450, 1400, 900] }));
    }
    console.log(`${s.name}: ${PROD}/?${q}`);
    await context.close();
  }
} finally {
  await browser.close();
  await rm(tmp, { recursive: true, force: true });
}
