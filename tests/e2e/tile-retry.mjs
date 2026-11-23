// Tile retry e2e: a base-map tile that fails once must be requested again and
// drawn, not left as a hole. Runs against a local `next start`.
//
//   npm run build
//   PLAYWRIGHT_DIR=/path/to/node_modules node tests/e2e/tile-retry.mjs [screenshot-dir]
//
// PLAYWRIGHT_DIR must contain the `playwright` package (not a repo dependency).
// TILE_RETRY_SELFTEST=1 answers the retry with a broken image: the drawing
// check must then fail, which shows that it can catch a tile that never shows.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.PORT || 3000 + Math.floor(Math.random() * 900) + 4000);
const BASE = `http://localhost:${PORT}`;
const VIEW = `${BASE}/?c=55.0450,10.6100,13.00&s=25000&f=A4&o=p`;
const dir = process.env.PLAYWRIGHT_DIR;
const require = createRequire(dir ? `${dir}/` : import.meta.url);
const { chromium } = require("playwright");
const shots = process.argv[2];
const selftest = process.env.TILE_RETRY_SELFTEST === "1";

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
  if (!ok) failures.push(msg);
};

// The map canvas as RGBA (preserveDrawingBuffer is on).
const canvasPixels = (page) =>
  page.evaluate(() => {
    const src = document.querySelector(".maplibregl-canvas");
    const c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(src, 0, 0);
    return Array.from(ctx.getImageData(0, 0, c.width, c.height).data);
  });

const differingPixels = (a, b) => {
  if (a.length !== b.length) return Infinity;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) n++;
  }
  return n;
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
  const newPage = async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
    const page = await context.newPage();
    page.on("console", (m) => process.env.DEBUG && console.log("console:", m.text()));
    return page;
  };

  // Reference: the same view with every tile arriving the first time.
  const refPage = await newPage();
  await refPage.goto(VIEW);
  await refPage.locator(".maplibregl-canvas").waitFor();
  await sleep(8000);
  const reference = await canvasPixels(refPage);
  await refPage.context().close();

  // Fail the first DTK25 tile once, as a Dataforsyningen timeout would.
  const page = await newPage();
  let failedUrl = null;
  let retried = 0;
  await page.route("**/dtk_25_DAF?**", async (route) => {
    const url = route.request().url();
    if (failedUrl === null) {
      failedUrl = url;
      return route.fulfill({ status: 503, body: "" });
    }
    if (url === failedUrl) {
      retried++;
      if (selftest) return route.fulfill({ status: 200, contentType: "image/png", body: "not a png" });
    }
    return route.continue();
  });
  const loaded = page.waitForResponse((r) => r.url() === failedUrl && r.status() === 200, { timeout: 30000 }).catch(() => null);
  await page.goto(VIEW);
  await page.locator(".maplibregl-canvas").waitFor();
  // Before the first retry (2 s after the error) the hole shows the blurred
  // parent tile or grey background.
  while (failedUrl === null) await sleep(100);
  await sleep(1200);
  if (shots) await page.screenshot({ path: `${shots}/tile-retry-foer.png` });
  check((await loaded) !== null, "the failed tile is requested again and arrives");
  check(retried === 1, `asked again once, not in a loop (${retried})`);
  await sleep(3000); // let the map draw the tile that arrived
  if (shots) await page.screenshot({ path: `${shots}/tile-retry-efter.png` });
  // The status alone would pass an undecodable image or a tile never drawn:
  // the canvas must match the reference, hole included (a 256 px tile is
  // 65,536 px; a little slack for antialiasing and label placement).
  const diff = differingPixels(await canvasPixels(page), reference);
  check(diff < 256 * 256 / 8, `the tile is drawn in the hole (${diff} px differ from the reference)`);
} finally {
  await browser?.close();
  server.kill();
}
if (failures.length) {
  console.error(`${failures.length} failed`);
  process.exit(1);
}
