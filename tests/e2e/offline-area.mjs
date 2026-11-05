// E2E for "Gem området": download (max 6 in flight, progress, size), pause,
// cancel, offline use of the saved area, and deletion. Mocked tile server,
// local `next start` only (never production).
//
//   npm run build
//   PLAYWRIGHT_DIR=/path/to/node_modules node tests/e2e/offline-area.mjs
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.PORT || 3918);
const BASE = `http://localhost:${PORT}`;
const dir = process.env.PLAYWRIGHT_DIR;
const require = createRequire(dir ? `${dir}/` : import.meta.url);
const { chromium } = require("playwright");

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
  if (!ok) failures.push(msg);
};

// 1x1 JPEG
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64"
);

const server = spawn("npx", ["next", "start", "-p", String(PORT)], { stdio: "ignore" });
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {}
    await sleep(500);
  }
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  let inFlight = 0;
  let maxInFlight = 0;
  let delayMs = 30;
  const requested = new Set();
  await ctx.route("https://api.dataforsyningen.dk/**", async (route) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    requested.add(route.request().url());
    await sleep(delayMs);
    inFlight--;
    route.fulfill({
      status: 200,
      body: JPEG,
      headers: { "content-type": "image/jpeg", "access-control-allow-origin": "*" },
    });
  });

  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem("advancedMode", "true"));
  await page.goto(`${BASE}/?c=56.1,10.2,14&s=25000&f=A4&o=p`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto(`${BASE}/?c=56.1,10.2,14&s=25000&f=A4&o=p`);
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.waitForSelector("canvas", { timeout: 15000 });

  await page.getByRole("button", { name: "Offline" }).click();
  const summary = await page.getByText(/fliser, ca\./).first().textContent();
  check(/fliser/.test(summary) && /MB|KB/.test(summary), `plan shows count and size: "${summary}"`);
  const shot = (name) =>
    process.env.SHOT_DIR &&
    page.screenshot({ path: `${process.env.SHOT_DIR}/${name}.jpg`, type: "jpeg", quality: 75 });
  await shot("after-plan");
  const planned = Number(summary.match(/([\d.]+) fliser/)[1].replace(/\./g, ""));

  const offlineCount = () =>
    page.evaluate(async () => (await (await caches.open("topoprint-offline-v1")).keys()).length);

  // --- Cancel: slow server, abort midway, partial tiles are removed.
  delayMs = 150;
  await page.getByRole("button", { name: "Gem området" }).click();
  await page.waitForFunction(() => /\b[1-9]\d* af \d+ fliser/.test(document.body.innerText));
  // --- Pause: the counter must stand still.
  await page.getByRole("button", { name: "Pause" }).click();
  await sleep(600); // let the batch in flight finish
  const p1 = await page.getByText(/af \d+ fliser/).textContent();
  await sleep(1000);
  const p2 = await page.getByText(/af \d+ fliser/).textContent();
  check(p1 === p2 && /pause/.test(p2), `paused progress is stable: "${p2}"`);
  await page.getByRole("button", { name: "Fortsæt" }).click();
  await sleep(500);
  await page.getByRole("button", { name: "Afbryd" }).click();
  await page.getByRole("button", { name: "Gem området" }).waitFor({ timeout: 15000 });
  check((await offlineCount()) === 0, "cancel removes the partially fetched tiles");
  check((await page.getByRole("list", { name: "Gemte områder" }).count()) === 0, "cancelled run saves no area");

  // --- Full download.
  delayMs = 20;
  maxInFlight = 0;
  await page.getByRole("button", { name: "Gem området" }).click();
  await page.getByRole("list", { name: "Gemte områder" }).waitFor({ timeout: 90000 });
  await shot("after-saved");
  const count = await offlineCount();
  check(count === planned, `saved ${count} tiles, planned ${planned}`);
  check(maxInFlight <= 6, `max ${maxInFlight} concurrent tile requests (limit 6)`);
  const row = await page.getByRole("list", { name: "Gemte områder" }).textContent();
  check(/fliser, .*(KB|MB)/.test(row), `area listed with size: "${row.slice(0, 80)}"`);

  // --- Offline: pan/zoom inside the area, every tile answered from cache.
  await ctx.setOffline(true);
  const statuses = [];
  const onResponse = (r) => {
    if (r.url().startsWith("https://api.dataforsyningen.dk/")) statuses.push(r.status());
  };
  page.on("response", onResponse);
  requested.clear();
  await page.goto(`${BASE}/?c=56.1,10.2,14&s=25000&f=A4&o=p`);
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForTimeout(2500);
  const box = await page.locator("canvas").first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 30, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.press("+");
  await page.waitForTimeout(2500);
  check(statuses.length > 0, `map requested ${statuses.length} tiles offline`);
  check(statuses.every((s) => s === 200), `all offline tile responses were 200 (${[...new Set(statuses)]})`);
  page.off("response", onResponse);
  await ctx.setOffline(false);

  // --- Delete.
  await page.getByRole("button", { name: "Offline" }).click(); // collapsed after reload
  await page.getByRole("button", { name: "Slet" }).click();
  await page.waitForFunction(() => !document.querySelector('[aria-label="Gemte områder"]'));
  check((await offlineCount()) === 0, "delete empties the offline cache");
} finally {
  await browser?.close();
  server.kill();
}
if (failures.length) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nAll offline-area checks passed");
