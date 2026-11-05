// Offline e2e: service worker registration, app shell offline, static asset
// and tile caching. Runs against a local `next start` (never production).
//
//   npm run build
//   PLAYWRIGHT_DIR=/path/to/node_modules node tests/e2e/offline.mjs
//
// PLAYWRIGHT_DIR must contain the `playwright` package (not a repo dependency).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.PORT || 3917);
const BASE = `http://localhost:${PORT}`;
const RUNS = Number(process.env.RUNS || 10);
const dir = process.env.PLAYWRIGHT_DIR;
const require = createRequire(dir ? `${dir}/` : import.meta.url);
const { chromium } = require("playwright");

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
  if (!ok) failures.push(msg);
};

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  stdio: "ignore",
});
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {}
    await sleep(500);
  }

  const browser = await chromium.launch();

  // 1. Registration within 3 s, repeated on fresh contexts.
  let registered = 0;
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE);
    const ok = await page
      .waitForFunction(
        async () => (await navigator.serviceWorker.getRegistrations()).length === 1,
        null,
        { timeout: 3000 }
      )
      .then(() => true, () => false);
    if (ok) registered++;
    await ctx.close();
  }
  check(registered === RUNS, `SW registered within 3 s in ${registered}/${RUNS} runs`);

  // 2. Offline behaviour after a first visit.
  const ctx = await browser.newContext();
  let tileHits = 0;
  await ctx.route("https://api.dataforsyningen.dk/**", (route) => {
    tileHits++;
    route.fulfill({
      status: 200,
      body: "tile",
      headers: { "access-control-allow-origin": "*" },
    });
  });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto(`${BASE}/om`); // visited pages are cached on navigation
  await page.goto(BASE);
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.waitForSelector("canvas", { timeout: 15000 });

  const cached = await page.evaluate(async () => {
    const keys = await (await caches.open("topoprint-v3")).keys();
    return keys.map((r) => new URL(r.url).pathname);
  });
  check(
    cached.some((p) => p.startsWith("/_next/static/") && p.endsWith(".js")) &&
      cached.some((p) => p.endsWith(".css")),
    `hashed JS and CSS cached (${cached.length} entries)`
  );

  // Tile cache: 100 distinct tiles, then the same 100 again.
  const tileUrl = (n) => `https://api.dataforsyningen.dk/test_tiles/${n}.pbf?x=1`;
  const fetchTiles = () =>
    page.evaluate(async (urls) => {
      await Promise.all(urls.map((u) => fetch(u).then((r) => r.text())));
    }, Array.from({ length: 100 }, (_, n) => tileUrl(n)));
  await fetchTiles();
  const cold = tileHits;
  await fetchTiles();
  const warm = tileHits - cold;
  check(warm <= 10, `warm tile load hit the network ${warm}/100 times (max 10)`);

  const failed = [];
  page.on("requestfailed", (r) => {
    if (r.url().startsWith(BASE)) failed.push(r.url());
  });
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector("canvas", { timeout: 15000 });
  check(
    (await page.getByRole("button", { name: /Download PDF/i }).count()) > 0,
    "offline: / shows map canvas and Download PDF"
  );
  check(failed.length === 0, `offline reload: ${failed.length} failed requests to own origin ${failed.join(" ")}`);
  check(
    (await page.getByText(/Du er offline/).count()) > 0,
    "offline banner shown"
  );
  await page.goto(`${BASE}/om`);
  check(!(await page.title()).startsWith("Offline"), "offline: /om opens from cache");
  await page.goto(`${BASE}/?lat=55.7&lng=12.4&z=10`);
  await page.waitForSelector("canvas", { timeout: 15000 });
  check(true, "offline: deep link opens app shell");
  await page.goto(`${BASE}/findes-ikke-i-cachen`);
  check((await page.title()).startsWith("Offline"), "offline: uncached path shows offline.html");
  await browser.close();
} finally {
  server.kill();
}
if (failures.length) {
  console.log(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
