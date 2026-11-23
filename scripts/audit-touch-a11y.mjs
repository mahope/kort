// Touch-target / input-size / axe audit for a locally running kort (next start).
// Usage: BASE=http://localhost:3123 OUT=/tmp/kort-audit CHECK=1 node scripts/audit-touch-a11y.mjs
// Playwright and @axe-core/playwright are resolved from TOOLS (not a repo dependency).
import { createRequire } from "node:module";
import fs from "node:fs";

const TOOLS = process.env.TOOLS || `${process.env.HOME}/dev/data/audit-2026-11-05/tools`;
const require = createRequire(`${TOOLS}/`);
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;

const BASE = process.env.BASE || "http://localhost:3123";
const OUT = process.env.OUT || "docs/screenshots/issue-23/after";
const CHECK = process.env.CHECK === "1";
const WIDTHS = (process.env.WIDTHS || "360,390,768").split(",").map(Number);
if (CHECK && !WIDTHS.includes(390)) throw new Error("CHECK requires the 390px touch viewport");
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
function measure({ checkHitArea, hitScope }) {
  function hasHitArea(target) {
    const offsets = [];
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth || parent === document.scrollingElement) {
        offsets.push([parent, parent.scrollLeft, parent.scrollTop]);
      }
    }
    try {
      target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      const { left, top, right, bottom } = target.getBoundingClientRect();
      const x = Math.max(0, left);
      const y = Math.max(0, top);
      const dx = Math.min(document.documentElement.clientWidth, right) - x - 44;
      const dy = Math.min(document.documentElement.clientHeight, bottom) - y - 44;
      if (dx < -0.01 || dy < -0.01) return false;
      // Sample the edges and center without treating rounded corners as clipping.
      const samples = [[1, 22], [43, 22], [22, 1], [22, 43], [22, 22]];
      return [0, dx / 2, dx].some((tx) => [0, dy / 2, dy].some((ty) =>
        samples.every(([ox, oy]) =>
          target.contains(document.elementFromPoint(x + tx + ox, y + ty + oy)))));
    } finally {
      for (const [el, left, top] of offsets) el.scrollTo({ left, top, behavior: "instant" });
    }
  }

  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || el.closest(".sr-only, [inert]")) return false;
    // Do not scroll into closed disclosures. Chromium can reveal them.
    const closedDetails = el.closest("details:not([open])");
    if (closedDetails && !closedDetails.querySelector(":scope > summary")?.contains(el)) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  };
  const desc = (el) =>
    `${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ""} "${(el.getAttribute("aria-label") || el.innerText || el.value || el.title || "").toString().trim().replace(/\s+/g, " ").slice(0, 28)}"`;
  const sel = 'a[href],button,input,select,textarea,summary,[role=button],[role=option],[role=radio],[data-sheet-handle]';
  const small = [];
  let total = 0;
  for (const el of document.querySelectorAll(sel)) {
    if (!vis(el)) continue;
    total++;
    let target = el;
    if (el.tagName === "INPUT" && (el.type === "radio" || el.type === "checkbox")) {
      target = el.labels?.[0] || el;
    }
    const r = target.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) {
      small.push(`${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    } else if (checkHitArea && (!hitScope || el.closest(hitScope)) && !hasHitArea(target)) {
      small.push(`${desc(el)} has no reachable 44x44 hit area`);
    }
  }
  const smallFields = [];
  for (const el of document.querySelectorAll("input,select,textarea")) {
    if (!vis(el) || ["radio", "checkbox", "range", "color", "file", "hidden"].includes(el.type)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) smallFields.push(`${desc(el)} ${fs}px`);
  }
  const smallText = new Map();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode;
    if (!n.textContent.trim()) continue;
    const p = n.parentElement;
    if (!p || !vis(p) || p.closest(".maplibregl-control-container")) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    if (!range.getClientRects().length) continue;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < 12) smallText.set(`${fs}px "${n.textContent.trim().slice(0, 30)}"`, 1);
  }
  return { total, small, smallFields, smallText: [...smallText.keys()] };
}

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
async function axe(page) {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return r.violations.map((v) => `${v.id}(${v.nodes.length})` + (v.id === "target-size" ? ":" + v.nodes.map((n) => n.target.join(" ") + " " + (n.any[0] && n.any[0].message)).join("|") : ""));
}

const browser = await chromium.launch({ chromiumSandbox: true });
const report = [];
console.log(`axe-core ${require("axe-core/package.json").version}`);
try {
  for (const w of [...WIDTHS, 1440]) {
    const touch = w !== 1440;
    const ctx = await browser.newContext({
      viewport: { width: w, height: touch ? (w >= 768 ? 1024 : 844) : 900 },
      hasTouch: touch,
      reducedMotion: "reduce",
      isMobile: touch,
      deviceScaleFactor: 1,
    });
    await ctx.route("**/adressevaelger.dk/**", (r) => r.fulfill({ json: MOCK_SEARCH }));
    await ctx.route("**/api/stednavne**", (r) => r.fulfill({ json: [] }));
    if (w === 390) {
      await ctx.addInitScript(() => {
        localStorage.setItem("topoprint-history", JSON.stringify({
          state: { entries: [{ id: "audit", date: "2026-01-01T12:00:00Z", lng: 10.8, lat: 55.7, zoom: 10,
            scale: 25000, paperFormat: "A4", orientation: "portrait", baseLayer: "topo" }] },
          version: 0,
        }));
      });
    }
    const page = await ctx.newPage();
    page.setDefaultTimeout(10_000);
    const snap = async (state) => {
      await page.screenshot({ path: `${OUT}/${state}-${w}.jpg`, type: "jpeg", quality: 80, scale: "css", animations: "disabled" });
      // An open popup may intentionally cover controls audited in the closed state.
      const hitScope = {
        search: '[role="option"], #search-input, button[aria-label="Ryd søgning"]',
        layers: 'div:has(> button[title="Kortlag"])',
        attribution: '.maplibregl-ctrl-attrib',
      }[state];
      const m = await page.evaluate(measure, { checkHitArea: w === 390, hitScope });
      m.axe = w === 390 ? await axe(page) : undefined;
      report.push({ width: w, state, ...m });
    };
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.locator(".maplibregl-ctrl-attrib-button").waitFor();
    if (await page.evaluate(() => matchMedia("(pointer: coarse)").matches) !== touch) {
      throw new Error(`Unexpected pointer type at ${w}px`);
    }
    await snap("start");

    await page.locator("#search-input").fill("testvej");
    await page.getByRole("option").first().waitFor();
    await snap("search");
    await page.getByRole("button", { name: "Ryd søgning" }).click();
    await page.getByRole("button", { name: "Alle indstillinger og værktøjer" }).click();
    await page.getByRole("checkbox", { name: /Flersidet udskrift/ }).check();
    await snap("advanced");

    await page.locator("button[title='Kortlag']").click();
    await snap("layers");

    if (w === 390) {
      await page.locator("button[title='Kortlag']").click();
      const attribution = page.locator(".maplibregl-ctrl-attrib");
      if (!(await attribution.getByRole("link", { name: "Datakilder" }).isVisible())) {
        await attribution.locator("summary").click();
      }
      await attribution.getByRole("link", { name: "Datakilder" }).waitFor();
      await snap("attribution");
      await attribution.locator("summary").click();

      const sidebar = page.getByRole("complementary", { name: "Kortindstillinger" });
      await sidebar.getByRole("checkbox", { name: "Koordinatgitter" }).check();
      await sidebar.getByRole("checkbox", { name: "Koordinater langs kanten" }).check();
      await sidebar.getByRole("button", { name: "Tegning & Mål" }).click();
      await sidebar.getByRole("button", { name: "Bogmærker" }).click();
      await sidebar.getByRole("button", { name: "Gem position" }).click();
      await sidebar.getByRole("button", { name: "Historik" }).click();
      await snap("expanded-tools");

      await sidebar.getByRole("checkbox", { name: "Koordinatgitter" }).uncheck();
      await sidebar.locator('input[type="file"]').setInputFiles({
        name: "audit.geojson",
        mimeType: "application/geo+json",
        buffer: Buffer.from(JSON.stringify({
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [10.8, 55.7] } }],
        })),
      });
      await sidebar.getByRole("button", { name: "Skjul lag" }).tap();
      await sidebar.getByRole("button", { name: "Vis lag" }).tap();
      await sidebar.getByRole("button", { name: "audit.geojson", exact: true }).tap();
      await page.getByText("1 fil importeret", { exact: true }).waitFor({ state: "hidden" });
      await snap("imported-layer");
      await sidebar.getByRole("button", { name: "Slet lag" }).tap();
      await sidebar.getByRole("button", { name: "Slet lag" }).waitFor({ state: "detached" });

      const cdp = await ctx.newCDPSession(page);
      const bottomInset = 34;
      await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { bottom: bottomInset } });

      const handle = sidebar.getByRole("button", { name: "Kortindstillinger" });
      await handle.tap();
      await handle.and(page.locator('[aria-expanded="false"]')).waitFor();
      await page.waitForFunction(() => {
        const footer = document.querySelector("[data-sheet-scroll]").nextElementSibling;
        return parseFloat(getComputedStyle(footer).paddingBottom) === 34;
      });
      const pdfButton = sidebar.getByRole("button", { name: "Download PDF" });
      await pdfButton.scrollIntoViewIfNeeded();
      await snap("minimized");
      const pdf = await pdfButton.boundingBox();
      report.at(-1).pdfBottom = pdf ? pdf.y + pdf.height : null;
      const safeBottom = 844 - bottomInset;
      if (!pdf || pdf.y < 0 || pdf.y + pdf.height > safeBottom) {
        report.at(-1).small.push(`Download PDF crosses safe-area boundary y=${safeBottom}: ${JSON.stringify(pdf)}`);
      }
      await handle.press("Enter");
      await handle.and(page.locator('[aria-expanded="true"]')).waitFor();
      const grip = await handle.boundingBox();
      await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
      await page.mouse.down();
      await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 + 240, { steps: 4 });
      await page.mouse.up();
      await handle.and(page.locator('[aria-expanded="false"]')).waitFor();
      await cdp.detach();
    }

    await page.goto(`${BASE}/om`, { waitUntil: "domcontentloaded" });
    await page.locator("main h1").waitFor();
    const brand = process.env.NEXT_PUBLIC_BRAND;
    if (brand) {
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      if (new URL(canonical).hostname !== `kort.${brand}.dk`) throw new Error(`Unexpected canonical for ${brand}: ${canonical}`);
    }
    await snap("about");
    await ctx.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
for (const r of report) {
  console.log(`\n== ${r.width} ${r.state}: ${r.total} interactive, ${r.small.length} <44px, ${r.smallFields.length} fields <16px, ${r.smallText.length} text <12px${r.axe ? ", axe: " + (r.axe.join(",") || "none") : ""}`);
  if (r.width === 1440) continue;
  for (const s of r.small) console.log("  small:", s);
  for (const s of r.smallFields) console.log("  field:", s);
  for (const s of r.smallText) console.log("  text:", s);
}

if (CHECK && report.some((r) => r.width === 390 &&
  (r.small.length || r.smallFields.length || r.smallText.length || r.axe.some((v) => v.startsWith("target-size("))))) {
  process.exitCode = 1;
}
