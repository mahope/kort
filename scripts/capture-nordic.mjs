// Screenshots and PDFs of print frames in Norway and Sweden (feat/norge-sverige).
// Runs against a local `next start` after `npm run build`:
//
//   KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-nordic.mjs <outdir>
//
// For each place: a screenshot of the app (map, print frame, sidebar) and the
// downloaded PDF. Also counts tile requests per host, so a run proves which
// sources the screen and the PDF actually used.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const { chromium } = await import(process.env.KORT_PLAYWRIGHT_MODULE || "playwright");
const outDir = process.argv[2] || "capture-nordic";
mkdirSync(outDir, { recursive: true });
const port = Number(process.env.PORT || 3000 + Math.floor(Math.random() * 2000) + 1000);
const base = `http://localhost:${port}`;

const PLACES = [
  { name: "jotunheimen", query: "c=61.6200,8.3300,12.40&s=25000&f=A4&o=p&d=300&g=1" },
  { name: "jotunheimen-kun-hoejdekurver", query: "c=61.6200,8.3300,12.40&s=25000&f=A4&o=p&d=300&g=1&l=n&ov=kn-100" },
  { name: "kebnekaise", query: "c=67.9000,18.5600,11.40&s=50000&f=A4&o=l&d=200&g=1" },
  { name: "dalsland", query: "c=59.0700,12.3000,12.40&s=25000&f=A4&o=p&d=300&g=1" },
  { name: "svinesund", query: "c=59.1000,11.2600,11.40&s=50000&f=A4&o=l&d=200&g=1" },
  { name: "danmark-kontrol", query: "c=56.1040,9.6850,12.40&s=25000&f=A4&o=p&d=300&g=1" },
];

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (c) => (serverOutput += c));
server.stderr.on("data", (c) => (serverOutput += c));
let browser;
try {
  for (let i = 0; i < 150; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
    if (i === 149) throw new Error("Local server did not become ready");
  }
  browser = await chromium.launch({ headless: true, chromiumSandbox: true });

  for (const place of PLACES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    const hosts = {};
    let phase = "screen";
    const cspViolations = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/.test(m.text())) cspViolations.push(m.text().slice(0, 160));
    });
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (u.origin === base) return;
      const key = `${phase}:${u.host}`;
      hosts[key] = (hosts[key] || 0) + 1;
    });
    const failed = [];
    page.on("requestfailed", (req) => failed.push(`${phase}:${new URL(req.url()).host}`));

    await page.goto(`${base}/?${place.query}`, { waitUntil: "domcontentloaded" });
    const button = page.getByRole("button", { name: "Download PDF" });
    await button.waitFor({ timeout: 60000 });
    await page.waitForTimeout(6000); // let tiles settle
    await page.screenshot({ path: join(outDir, `${place.name}-skaerm.png`) });

    phase = "pdf";
    const downloadPromise = page.waitForEvent("download", { timeout: 180000 });
    await button.click();
    const toast = page.locator('[role="alert"], [role="status"]').filter({ hasText: /PDF downloadet|Fejl/ }).first();
    await toast.waitFor({ timeout: 180000 });
    const toastText = (await toast.innerText()).trim();
    let pdfPath = null;
    if (/PDF downloadet/.test(toastText)) {
      const download = await downloadPromise;
      pdfPath = join(outDir, `${place.name}.pdf`);
      await download.saveAs(pdfPath);
    }
    console.log(JSON.stringify({ place: place.name, toast: toastText, pdf: pdfPath, hosts, failed: [...new Set(failed)], csp: cspViolations }));
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
