// Verifies that PDF generation never reports silent success when the map is
// offline or tiles fail (issue #18). Runs against a local `next start`.
//
//   npm run build
//   KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-pdf-failures.mjs
//
// Scenarios: online (control: download + success toast), offline (error toast,
// no download), and 15 % injected HTTP 500 on tile requests (either a download
// with success toast, or an error toast and no download; never both/neither).
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.KORT_PLAYWRIGHT_MODULE || "playwright");
const port = Number(process.env.PORT || 3198);
const base = `http://localhost:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
let serverOutput = "";
server.stdout.on("data", (c) => { serverOutput += c; });
server.stderr.on("data", (c) => { serverOutput += c; });
let browser;
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 200));
    if (i === 99) throw new Error("Local server did not become ready");
  }
  browser = await chromium.launch({ headless: true, chromiumSandbox: true });

  async function scenario(name, setup) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    let tileRequests = 0;
    let tileFailures = 0;
    await page.goto(`${base}/?c=55.67610,12.56830,12.0`, { waitUntil: "domcontentloaded" });
    const button = page.getByRole("button", { name: "Download PDF" });
    await button.waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Download PDF/.test(b.textContent ?? "") && !b.disabled));
    await page.waitForTimeout(3000); // let the visible map settle
    await setup(context, page, {
      onTile: (failed) => { tileRequests++; if (failed) tileFailures++; },
    });
    let download = null;
    page.on("download", (d) => { download = d; });
    await button.click();
    const toast = page.locator('[role="alert"], [role="status"]').filter({ hasText: /PDF downloadet|Fejl ved PDF-generering/ }).first();
    await toast.waitFor({ timeout: 120000 });
    const text = (await toast.innerText()).trim();
    const isError = (await toast.getAttribute("role")) === "alert";
    await page.waitForTimeout(500);
    await context.close();
    console.log(JSON.stringify({ scenario: name, toast: text, isError, downloaded: !!download, tileRequests, tileFailures }));
    return { text, isError, downloaded: !!download, tileFailures };
  }

  const isTile = (url) => /^https:\/\/(api\.dataforsyningen\.dk\/|tile\.openstreetmap\.org\/)/.test(url);

  const online = await scenario("online", async () => {});
  assert.ok(online.downloaded && !online.isError && /PDF downloadet/.test(online.text), "online control must succeed");

  const offline = await scenario("offline", async (ctx) => { await ctx.setOffline(true); });
  assert.ok(!offline.downloaded && offline.isError && /offline/i.test(offline.text), "offline must give error toast and no download");

  let n = 0;
  const flaky = await scenario("tiles-15pct-500", async (ctx, page, { onTile }) => {
    await ctx.route((u) => isTile(u.toString()), async (route) => {
      const fail = ++n % 20 < 3; // exactly 15 %
      onTile(fail);
      if (fail) await route.fulfill({ status: 500, body: "injected" });
      else await route.continue();
    });
  });
  assert.ok(flaky.tileFailures > 0, "failures must actually have been injected");
  assert.ok(flaky.downloaded !== flaky.isError, "flaky tiles: exactly one of download+success or error toast");
  if (flaky.downloaded) assert.match(flaky.text, /PDF downloadet/);
  console.log("OK");
} finally {
  await browser?.close();
  server.kill();
}
