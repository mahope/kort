// CSP smoke test: drives the app against a LOCAL server and fails on any
// securitypolicyviolation event. Usage:
//   PLAYWRIGHT_DIR=/path/to/node_modules BASE_URL=http://localhost:3871 \
//     node scripts/csp-smoke.mjs
// Never point this at production.
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(
  path.join(process.env.PLAYWRIGHT_DIR ?? process.cwd(), "noop.js")
);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3871";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(BASE)) {
  throw new Error("BASE_URL must be localhost");
}

const BASE_LAYERS = [
  "Skærmkort",
  "Topografisk kort 1:25.000",
  "Ortofoto (luftfoto)",
  "OpenStreetMap",
  "Høje Målebordsblade",
  "Lave Målebordsblade",
];
const OVERLAYS = ["Højdekurver", "Skyggekort", "Stednavne", "Matrikelskel"];
const GPX = `<?xml version="1.0"?><gpx version="1.1" creator="t" xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg><trkpt lat="56.15" lon="10.21"/><trkpt lat="56.16" lon="10.22"/></trkseg></trk></gpx>`;

const violations = [];
const steps = [];
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
  locale: "da-DK",
});
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) =>
    window.__csp.push(
      `${e.violatedDirective} blocked=${e.blockedURI} src=${e.sourceFile ?? ""}`
    )
  );
});
// Never hit the real analytics endpoint; the CSP check happens before routing.
await ctx.route("https://analytics.holstjensen.eu/**", (r) =>
  r.fulfill({ status: 202, body: "ok" })
);
const page = await ctx.newPage();
const consoleCsp = [];
page.on("console", (m) => {
  if (/Content Security Policy|CSP/i.test(m.text()) && !m.text().includes("csp-canary")) consoleCsp.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => steps.push(`pageerror: ${String(e).slice(0, 200)}`));

const flush = async (name) => {
  const v = await page.evaluate(() => window.__csp.splice(0)).catch(() => []);
  violations.push(...v.map((x) => `[${name}] ${x}`));
  steps.push(`${name}: ${v.length} violations`);
};

await page.goto(`${BASE}/?c=56.15,10.21,13`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(3000);
await flush("load");

for (const label of BASE_LAYERS) {
  await page.getByText(label, { exact: false }).first().click();
  await page.waitForTimeout(3000);
  await flush(`layer ${label}`);
}
await page.getByText("Skærmkort", { exact: false }).first().click();
await page.waitForTimeout(1500);

await page.getByRole("button", { name: /^Avancerede indstillinger/ }).click();
for (const label of OVERLAYS) {
  await page.getByLabel(new RegExp(label)).first().check();
  await page.waitForTimeout(3000);
  await flush(`overlay ${label}`);
}

const search = page.getByPlaceholder(/Søg efter adresse/);
for (const q of ["Rådhuspladsen 1", "Rold Skov"]) {
  await search.fill("");
  await search.fill(q);
  await page.waitForTimeout(3000);
  const n = await page.locator("ul li button, [role=option]").count();
  steps.push(`search "${q}": ${n} suggestion elements`);
  await flush(`search ${q}`);
}
await search.fill("");

const gpx = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gpx-")), "t.gpx");
fs.writeFileSync(gpx, GPX);
await page.locator('input[type="file"]').first().setInputFiles(gpx);
await page.waitForTimeout(2500);
await flush("gpx import");

await page.evaluate(() =>
  fetch("https://analytics.holstjensen.eu/api/event", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ n: "csp-smoke", u: location.href, d: "kort.mahoje.dk" }),
  })
);
await page.waitForTimeout(500);
await flush("analytics event");

const dl = page.waitForEvent("download", { timeout: 180000 }).catch(() => null);
await page.getByRole("button", { name: /Download PDF/ }).click();
const d = await dl;
steps.push(`pdf download: ${d ? d.suggestedFilename() : "NONE"}`);
await page.waitForTimeout(1000);
await flush("pdf");

// Sanity: the detector must see a deliberately blocked request (never sent).
await page.evaluate(() => fetch("https://csp-canary.invalid/x").catch(() => {}));
await page.waitForTimeout(300);
const canary = await page.evaluate(() => window.__csp.splice(0));
steps.push(`canary violations (expected 1): ${canary.length}`);
if (canary.length !== 1) violations.push("canary not detected: detector broken");

await browser.close();
console.log(steps.join("\n"));
console.log("console CSP messages:", consoleCsp.length);
for (const m of consoleCsp) console.log("  ", m);
console.log("TOTAL securitypolicyviolation events:", violations.length);
for (const v of violations) console.log("  ", v);
process.exit(violations.length || consoleCsp.length || !d ? 1 : 0);
