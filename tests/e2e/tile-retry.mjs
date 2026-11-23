// Tile retry e2e: a base-map tile that fails once must be requested again and
// drawn, not left as a grey square. Runs against a local `next start`.
//
//   npm run build
//   PLAYWRIGHT_DIR=/path/to/node_modules node tests/e2e/tile-retry.mjs [screenshot-dir]
//
// PLAYWRIGHT_DIR must contain the `playwright` package (not a repo dependency).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.PORT || 3000 + Math.floor(Math.random() * 900) + 4000);
const BASE = `http://localhost:${PORT}`;
const dir = process.env.PLAYWRIGHT_DIR;
const require = createRequire(dir ? `${dir}/` : import.meta.url);
const { chromium } = require("playwright");
const shots = process.argv[2];

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
  if (!ok) failures.push(msg);
};

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { stdio: "ignore" });
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {}
    await sleep(500);
  }
  browser = await chromium.launch();
  // No service worker: page.route() does not see requests a worker answers.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  page.on("console", (m) => process.env.DEBUG && console.log("console:", m.text()));

  // Fail the first DTK25 tile once, as a Dataforsyningen timeout would.
  let failedUrl = null;
  let retried = 0;
  await page.route("**/dtk_25_DAF?**", async (route) => {
    const url = route.request().url();
    if (failedUrl === null) {
      failedUrl = url;
      return route.fulfill({ status: 503, body: "" });
    }
    if (url === failedUrl) retried++;
    return route.continue();
  });
  const loaded = page.waitForResponse((r) => r.url() === failedUrl && r.status() === 200, { timeout: 30000 }).catch(() => null);
  await page.goto(`${BASE}/?c=55.0450,10.6100,13.00&s=25000&f=A4&o=p`);
  await page.locator(".maplibregl-canvas").waitFor();
  await sleep(1000);
  if (shots) await page.screenshot({ path: `${shots}/tile-retry-foer.png` });
  check((await loaded) !== null, "the failed tile is requested again and arrives");
  check(retried === 1, `asked again once, not in a loop (${retried})`);
  await sleep(3000); // let the map draw the tile that arrived
  if (shots) await page.screenshot({ path: `${shots}/tile-retry-efter.png` });
} finally {
  await browser?.close();
  server.kill();
}
if (failures.length) {
  console.error(`${failures.length} failed`);
  process.exit(1);
}
