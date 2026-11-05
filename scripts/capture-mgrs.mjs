// Use an existing Playwright installation; this script never installs a browser.
// KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-mgrs.mjs
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.KORT_PLAYWRIGHT_MODULE || "playwright");
const port = 3197;
const base = `http://localhost:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });
let browser;
const results = [];
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (i === 99) throw new Error("Local server did not become ready");
  }
  browser = await chromium.launch({ headless: true, chromiumSandbox: true });
  await mkdir("docs/mgrs", { recursive: true });
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, permissions: ["clipboard-read", "clipboard-write"], isMobile: width === 390, hasTouch: width === 390, colorScheme: "light" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/?c=55.67610,12.56830,12.0&g=1&cs=mgrs&gs=1000&d=150`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("utm-grid-badge").filter({ hasText: "MGRS 33U UB" }).waitFor();
    await page.locator(".maplibregl-canvas").waitFor();
    await page.waitForTimeout(12000);
    await page.locator("summary").filter({ hasText: "Koordinat ved sigtekorset" }).click();
    await page.getByText("33U UB 47090 72711", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Kopiér MGRS · 1 m", exact: true }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "33U UB 47090 72711");
    for (const [name, value] of [
      ["MGRS · 10 m", "33U UB 4709 7271"],
      ["UTM · WGS84", "33N 347090 6172711"],
      ["Bredde/længde · WGS84", "55.676100, 12.568300"],
    ]) {
      await page.getByRole("button", { name: `Kopiér ${name}`, exact: true }).click();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), value);
    }
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `docs/mgrs/mgrs-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Horizontal overflow");
    if (width === 1440) {
      await page.locator("#grid-system").selectOption("utm");
      await page.getByTestId("utm-grid-badge").filter({ hasText: "UTM 32N" }).waitFor();
      await page.locator("#grid-system").selectOption("mgrs");
      await page.waitForFunction(() => location.search.includes("cs=mgrs"));
      await page.reload({ waitUntil: "domcontentloaded" });
      assert.equal(await page.locator("#grid-system").inputValue(), "mgrs");
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await page.getByLabel("Koordinatgitter", { exact: true }).check();
      assert.equal(await page.locator("#grid-system").inputValue(), "mgrs", "localStorage selection");
      await page.goto(`${base}/?c=55.10100,14.70600,12.0&g=1&cs=mgrs&gs=1000&d=150`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("utm-grid-badge").filter({ hasText: "MGRS 33U VB" }).waitFor();
      await page.locator("summary").filter({ hasText: "Koordinat ved sigtekorset" }).click();
      await page.getByText("33U VB 81240 06070", { exact: true }).waitFor();
      await page.screenshot({ path: "docs/mgrs/mgrs-bornholm.png" });
      await page.goto(`${base}/?c=55.70000,12.00000,11.5&g=1&cs=mgrs&gs=1000&d=150&s=100000&b=37`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("utm-grid-badge").waitFor();
      await page.screenshot({ path: "docs/mgrs/mgrs-zone-boundary.png" });
      const downloadPromise = page.waitForEvent("download", { timeout: 90000 });
      await page.getByRole("button", { name: "Download PDF", exact: true }).click();
      const download = await downloadPromise;
      await download.saveAs("docs/mgrs/mgrs-zone-boundary.pdf");
      const pdfText = (await readFile("docs/mgrs/mgrs-zone-boundary.pdf")).toString("latin1");
      for (const text of ["(32U) Tj", "(33U) Tj", "(PG ", "(UB ", "MGRS", "WGS84"]) assert.ok(pdfText.includes(text), `PDF missing ${text}`);
      results.push("Downloaded rotated PDF spanning zones 32/33 at 1:100000, 150 DPI; checked both zone and square labels in PDF text");
      await page.goto(`${base}/?c=55.70000,12.00000,11.5&g=1&cs=mgrs&gs=1000&d=150&s=50000&mp=1&gc=2&gr=1`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("utm-grid-badge").waitFor();
      const multiDownload = page.waitForEvent("download", { timeout: 90000 });
      await page.getByRole("button", { name: "Download PDF", exact: true }).click();
      await (await multiDownload).saveAs("docs/mgrs/mgrs-multipage.pdf");
      const multiText = (await readFile("docs/mgrs/mgrs-multipage.pdf")).toString("latin1");
      for (const text of ["(32U) Tj", "(33U) Tj", "Side A1", "Side A2"]) assert.ok(multiText.includes(text), `Multipage PDF missing ${text}`);
      results.push("Downloaded two-page MGRS PDF spanning zones 32/33; checked page names and both zones");
    }
    await page.goto(`${base}/?c=55.67610,12.56830,12.0&g=1&cs=mgrs&gs=1000&d=150`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("utm-grid-badge").waitFor();
    await page.waitForTimeout(12000);
    await page.locator("summary").filter({ hasText: "Koordinat ved sigtekorset" }).click();
    await page.emulateMedia({ colorScheme: "dark" });
    await page.screenshot({ path: `docs/mgrs/mgrs-dark-${width}.png` });
    assert.deepEqual(errors, [], "Browser runtime errors");
    results.push(`${width}px: MGRS grid, 1 m/10 m readout, clipboard, no horizontal overflow, light/dark screenshots, no page errors`);
    await context.close();
  }
  await writeFile("docs/mgrs/browser-results.json", JSON.stringify(results, null, 2) + "\n");
  console.log(results.join("\n"));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await new Promise((resolve) => server.exitCode !== null ? resolve() : server.once("exit", resolve));
}
