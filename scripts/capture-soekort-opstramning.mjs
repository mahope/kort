// Before/after screenshots of the sea and lake layers: desktop, mobile and the PDF map page.
// Uses an existing Playwright installation and poppler's pdftoppm; installs nothing.
// npm run build && KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-soekort-opstramning.mjs <out-dir> <prefix>
import { spawn, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { chromium } = await import(process.env.KORT_PLAYWRIGHT_MODULE || "playwright");
const [OUT = "docs/screenshots/soekort-opstramning", PREFIX = "efter"] = process.argv.slice(2);
const port = 6000 + Math.floor(Math.random() * 1000);
// KORT_BASE_URL (e.g. https://kort.mahoje.dk) captures a deployed site instead of a local next start.
const base = process.env.KORT_BASE_URL || `http://localhost:${port}`;

const CASES = [
  { name: "svendborgsund", q: "c=55.0450,10.6100,13.00&s=25000&f=A4&o=p&d=300&ov=dd,hb,hd,sm,vr" },
  { name: "oehavet", q: "c=55.0500,10.6200,11.60&s=50000&f=A4&o=l&d=150&ov=dd,hb,hd,sm,vr" },
  { name: "furesoe", q: "c=55.8020,12.4200,13.00&s=25000&f=A4&o=l&d=150&ov=sd,ik" },
  { name: "kattegat", q: "c=56.6900,11.5000,10.70&s=100000&f=A4&o=l&d=150&ov=dd,hb,hd,sm,vr" },
];

/** PNG to a small lossy WebP next to it, so the repo stays light. */
function toWebp(png) {
  execFileSync("magick", [png, "-quality", "78", png.replace(/\.png$/, ".webp")]);
  execFileSync("rm", [png]);
}

const server = process.env.KORT_BASE_URL
  ? { exitCode: null, kill() {}, stdout: { on() {} }, stderr: { on() {} } }
  : spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
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
  const only = process.env.CASES?.split(",");
  for (const c of CASES.filter((c) => !only || only.includes(c.name))) {
    for (const vp of [{ tag: "mobil", width: 390, height: 844, mobile: true }, { tag: "skaerm", width: 1440, height: 900 }]) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        ...(vp.mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
        acceptDownloads: true,
        colorScheme: "light",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${base}/?${c.q}`, { waitUntil: "domcontentloaded" });
      await page.locator(".maplibregl-canvas").waitFor();
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(4000);
      const shot = `${OUT}/${PREFIX}-${c.name}-${vp.tag}.png`;
      await page.screenshot({ path: shot });
      toWebp(shot);
      if (!vp.mobile) {
        const download = page.waitForEvent("download", { timeout: 180000 });
        await page.getByRole("button", { name: /Download PDF/ }).first().click();
        const file = path.join(tmp, `${c.name}.pdf`);
        try {
          await (await download).saveAs(file);
        } catch (e) {
          const failed = `${OUT}/${PREFIX}-${c.name}-pdf-fejl.png`;
          await page.screenshot({ path: failed });
          toWebp(failed);
          console.log(`${c.name}: no PDF`, e.message.split("\n")[0]);
          await context.close();
          continue;
        }
        const pdfPng = `${OUT}/${PREFIX}-${c.name}-pdf.png`;
        execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-r", "110", "-png", "-singlefile", file, pdfPng.replace(/\.png$/, "")]);
        toWebp(pdfPng);
        console.log(`${c.name}: pdf ${execFileSync("pdftotext", ["-f", "1", "-l", "1", file, "-"]).toString().split("\n").filter((l) => /Dybde|Sømærk|Vrag|Sødybd|Indsøk|navigation/i.test(l)).join(" / ")}`);
      }
      if (errors.length) console.log(`${c.name} ${vp.tag}: page errors`, errors);
      await context.close();
    }
  }
} finally {
  await browser?.close();
  server.kill();
  await rm(tmp, { recursive: true, force: true });
}
