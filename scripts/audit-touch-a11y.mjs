// Touch-target / input-size / axe audit for a locally running kort (next start).
// Usage: BASE=http://localhost:3123 OUT=docs/screenshots/issue-23/before node scripts/audit-touch-a11y.mjs
// Playwright and @axe-core/playwright are resolved from TOOLS (not a repo dependency).
import { createRequire } from "node:module";
import fs from "node:fs";

const TOOLS = process.env.TOOLS || `${process.env.HOME}/dev/data/audit-2026-11-05/tools`;
const require = createRequire(`${TOOLS}/`);
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;

const BASE = process.env.BASE || "http://localhost:3123";
const OUT = process.env.OUT || "docs/screenshots/issue-23/after";
const WIDTHS = (process.env.WIDTHS || "360,390,768").split(",").map(Number);
fs.mkdirSync(OUT, { recursive: true });

const MOCK_SEARCH = {
  status: "ok",
  fund: [
    { id: "1", type: "husnummer", titel: "Testvej 1, 1000 Testby" },
    { id: "2", type: "husnummer", titel: "Testvej 2, 1000 Testby" },
  ],
};

// Runs in the page: collects visible interactive elements and their effective target size
// (label area counts for radio/checkbox) plus font sizes.
function measure() {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  };
  const desc = (el) =>
    `${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ""} "${(el.getAttribute("aria-label") || el.innerText || el.value || el.title || "").toString().trim().replace(/\s+/g, " ").slice(0, 28)}"`;
  const sel = 'a[href],button,input,select,textarea,summary,[role=button],[role=option],[role=radio],[tabindex]:not([tabindex="-1"])';
  const small = [];
  let total = 0;
  for (const el of document.querySelectorAll(sel)) {
    if (!vis(el)) continue;
    total++;
    let r = el.getBoundingClientRect();
    if (el.tagName === "INPUT" && (el.type === "radio" || el.type === "checkbox")) {
      const lab = el.closest("label") || (el.id && document.querySelector(`label[for="${el.id}"]`));
      if (lab) r = lab.getBoundingClientRect();
    }
    if (r.width < 43.5 || r.height < 43.5) small.push(`${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  const smallFields = [];
  for (const el of document.querySelectorAll("input,select,textarea")) {
    if (!vis(el) || ["radio", "checkbox", "range", "file", "hidden"].includes(el.type)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) smallFields.push(`${desc(el)} ${fs}px`);
  }
  const smallText = new Map();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode;
    if (!n.textContent.trim()) continue;
    const p = n.parentElement;
    if (!p || !vis(p) || p.closest(".maplibregl-map")) continue;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < 12) smallText.set(`${fs}px "${n.textContent.trim().slice(0, 30)}"`, 1);
  }
  const mapLibre = [];
  for (const el of document.querySelectorAll(".maplibregl-map button, .maplibregl-map a")) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) mapLibre.push(`${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return { total, small, smallFields, smallText: [...smallText.keys()], mapLibre };
}

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
async function axe(page) {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return r.violations.map((v) => `${v.id}(${v.nodes.length})` + (v.id === "target-size" ? ":" + v.nodes.map((n) => n.target.join(" ") + " " + (n.any[0] && n.any[0].message)).join("|") : ""));
}

const browser = await chromium.launch();
const report = [];
for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: w >= 768 ? 1024 : 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  await ctx.route("**/adressevaelger.dk/**", (r) => r.fulfill({ json: MOCK_SEARCH }));
  await ctx.route("**/api/stednavne**", (r) => r.fulfill({ json: [] }));
  const page = await ctx.newPage();
  const snap = async (state) => {
    await page.waitForTimeout(400);
    const m = await page.evaluate(measure);
    m.axe = w === 390 ? await axe(page) : undefined;
    report.push({ width: w, state, ...m });
    await page.screenshot({ path: `${OUT}/${state}-${w}.jpg`, type: "jpeg", quality: 75, scale: "css" });
  };
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await snap("start");
  const input = page.locator("#search-input");
  if (await input.count()) {
    await input.fill("testvej");
    await page.waitForSelector("[role=option]", { timeout: 5000 }).catch(() => {});
    await snap("search");
    await page.locator("button[aria-label='Ryd søgning']").click().catch(() => {});
  }
  const adv = page.getByRole("button", { name: /^Avancerede/i });
  if (await adv.count()) {
    await adv.first().click();
    await page.waitForTimeout(500);
    await snap("advanced");
  }
  const layers = page.locator("button[title='Kortlag']");
  if (await layers.count()) {
    await layers.click();
    await snap("layers");
  }
  await ctx.close();
}
// /om and desktop axe (a11y rules only)
for (const w of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/om`, { waitUntil: "domcontentloaded" });
  const canonical = await page.locator("link[rel=canonical]").getAttribute("href").catch(() => null);
  console.log(`\n== /om ${w}: axe ${(await axe(page)).join(",") || "none"}, canonical ${canonical}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
for (const r of report) {
  console.log(`\n== ${r.width} ${r.state}: ${r.total} interactive, ${r.small.length} <44px, ${r.smallFields.length} fields <16px, ${r.smallText.length} text <12px${r.axe ? ", axe: " + (r.axe.join(",") || "none") : ""}`);
  for (const s of r.small) console.log("  small:", s);
  for (const s of r.smallFields) console.log("  field:", s);
  for (const s of r.smallText) console.log("  text:", s);
  for (const s of r.mapLibre) console.log("  maplibre:", s);
}
