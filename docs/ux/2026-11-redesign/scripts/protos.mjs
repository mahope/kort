// Screenshots of the three prototypes, plus a check for console errors and
// touch targets under 44 px on mobile.
// node protos.mjs <outDir> [a|b|c]   (PW_DIR = folder with a playwright install)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire((process.env.PW_DIR || "/home/mads/dev/shots") + "/");
const { chromium } = require("playwright");

const here = path.dirname(fileURLToPath(import.meta.url));
const protoDir = path.resolve(here, "../prototyper");
const [outDir, only] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const DESKTOP = { name: "desktop", width: 1440, height: 900, mobile: false };
const MOBILE = { name: "mobil", width: 390, height: 844, mobile: true };

const click = (sel) => async (p) => { await p.locator(sel).first().click(); await p.waitForTimeout(350); };
const role = (r, name) => async (p) => { await p.getByRole(r, { name }).first().click(); await p.waitForTimeout(350); };
const scrollTo = (sel) => async (p) => { await p.locator(sel).first().scrollIntoViewIfNeeded(); await p.waitForTimeout(200); };
const sheet = (pos) => async (p) => { await p.evaluate((x) => window.__open && window.__open.sheet.set(x), pos); await p.waitForTimeout(350); };

// Per direction: screenshots as [name, viewport, query, steps].
const PLAN = {
  a: { dir: "a-formaal", shots: [
    ["01-start", DESKTOP, "", []],
    ["02-kort-og-lag", DESKTOP, "", [click("#open-layers-map"), click("#lp-layers [data-focus='lg-vand']")]],
    ["03-formaal-sejlads", DESKTOP, "", [click(".prow[data-p='sejlads']"), scrollTo("[data-widget=scale]")]],
    ["04-print", DESKTOP, "", [click("#exp-print"), scrollTo("#printextra")]],
    ["05-vaerktoej", DESKTOP, "", [click("[data-tool='tegn']")]],
    ["06-start-moerk", DESKTOP, "theme=dark", []],
    ["07-solaris", DESKTOP, "brand=solaris", [click(".prow[data-p='orientering']")]],
    ["08-solaris-moerk", DESKTOP, "brand=solaris&theme=dark", [click("#open-layers-map")]],
    ["01-start", MOBILE, "", []],
    ["02-kort-og-lag", MOBILE, "", [click("#open-layers-map")]],
    ["03-print", MOBILE, "", [sheet("max"), scrollTo("[data-widget=paper]")]],
    ["05-vaerktoej", MOBILE, "", [sheet("max"), click("[data-tool='offline']")]],
    ["06-start-moerk", MOBILE, "theme=dark", []],
    ["07-solaris", MOBILE, "brand=solaris", [sheet("max")]],
  ] },
  b: { dir: "b-lagpanel", shots: [
    ["01-start", DESKTOP, "", []],
    ["02-kortlag-soeg", DESKTOP, "", [role("tab", /Kortlag/), async (p) => { await p.fill("#pane-kort input[type=search]", "dybde"); await p.waitForTimeout(300); }]],
    ["03-kortlag-aktive", DESKTOP, "", [click("#open-kort-map"), click("#pane-kort [data-focus='lg-terraen']"), click("#pane-kort input[data-focus='ov-kurver']"), click("#pane-kort [data-focus='lg-navne']"), click("#pane-kort input[data-focus='ov-matrikel']"), scrollTo("#pane-kort .sub")]],
    ["04-print-flere-valg", DESKTOP, "", [scrollTo("[data-focus='multi']"), click("[data-focus='multi']")]],
    ["05-vaerktoejer", DESKTOP, "", [role("tab", "Værktøjer")]],
    ["06-vaerktoej", DESKTOP, "", [role("tab", "Værktøjer"), click("[data-tool='import']")]],
    ["07-start-moerk", DESKTOP, "theme=dark", [role("tab", /Kortlag/)]],
    ["08-solaris", DESKTOP, "brand=solaris", []],
    ["09-solaris-moerk", DESKTOP, "brand=solaris&theme=dark", [role("tab", /Kortlag/)]],
    ["10-hurtigvalg-sejlads", DESKTOP, "", [role("tab", /Kortlag/), click("[data-preset='sejlads']")]],
    ["01-start", MOBILE, "", []],
    ["02-kortlag", MOBILE, "", [click("#open-kort-map"), async (p) => { await p.keyboard.type("hav"); await p.waitForTimeout(300); }]],
    ["04-print", MOBILE, "", [sheet("max")]],
    ["05-vaerktoejer", MOBILE, "", [sheet("max"), role("tab", "Værktøjer")]],
    ["07-start-moerk", MOBILE, "theme=dark", []],
    ["08-solaris", MOBILE, "brand=solaris", [sheet("max"), role("tab", /Kortlag/)]],
    ["10-hurtigvalg-sejlads", MOBILE, "", [sheet("max"), role("tab", /Kortlag/), click("[data-preset='sejlads']")]],
  ] },
  c: { dir: "c-trin", shots: [
    ["01-hvor", DESKTOP, "", []],
    ["02-hvad", DESKTOP, "", [role("tab", /Hvad/)]],
    ["03-print", DESKTOP, "", [role("tab", /Print/)]],
    ["04-print-flere-ark", DESKTOP, "", [role("tab", /Print/), click("#exp-print"), click("[data-focus='multi']")]],
    ["05-vaerktoej", DESKTOP, "", [click("[data-tool='import']")]],
    ["06-hvad-moerk", DESKTOP, "theme=dark", [role("tab", /Hvad/)]],
    ["07-solaris-print", DESKTOP, "brand=solaris", [role("tab", /Print/)]],
    ["08-solaris-moerk", DESKTOP, "brand=solaris&theme=dark", [role("tab", /Print/)]],
    ["01-hvor", MOBILE, "", []],
    ["02-hvad", MOBILE, "", [role("tab", /Hvad/)]],
    ["03-print", MOBILE, "", [role("tab", /Print/)]],
    ["06-print-moerk", MOBILE, "theme=dark", [role("tab", /Print/)]],
    ["07-solaris", MOBILE, "brand=solaris", [role("tab", /Hvad/)]],
  ] },
};

// Every rendered control counts, also the ones scrolled out of view.
async function smallTargets(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("button, a, select, input, [role=radio], [role=tab], label.check")) {
      if (el.closest(".protobar") || !el.checkVisibility()) continue;
      if (el.matches("input[type=checkbox]") && el.closest("label.check")) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.height < 43.5 || r.width < 43.5) out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return out;
  });
}

// The screenshots only show some states. On mobile, also turn on everything that
// adds controls (Skærmkort styles, layer variants, active chips, grid, several
// sheets, rotation) and visit every tab, open group, expander and tool panel.
async function sweep(page) {
  const found = new Set();
  const measure = async () => (await smallTargets(page)).forEach((s) => found.add(s));
  await page.evaluate(() => {
    const K = window.Kort;
    K.set({ base: "skaermkort", multi: true, grid: true, rotation: 10 });
    K.setOverlay("kurver", { on: true });
    K.setOverlay("havdybder", { on: true });
    if (window.__open) window.__open.sheet.set("max");
    if (window.__open && window.__open.layers) window.__open.layers();
  });
  await page.waitForTimeout(300);
  const openAll = () => page.evaluate(() => {
    const K = window.Kort;
    K.$$("[data-widget=layers]").forEach((el) => { el.dataset.open = K.GROUPS.map((g) => g.id).join(","); K.renderWidget(el); });
    K.$$(".expander[aria-expanded=false]").forEach((b) => b.checkVisibility() && b.click());
  });
  const tabs = await page.locator("[role=tab]").count();
  for (let i = 0; i < Math.max(1, tabs); i++) {
    if (tabs) await page.locator("[role=tab]").nth(i).evaluate((t) => t.click());
    await openAll();
    await page.waitForTimeout(200);
    await measure();
  }
  for (const id of await page.evaluate(() => window.Kort.TOOLS.map((t) => t.id))) {
    await page.evaluate((x) => document.dispatchEvent(new CustomEvent("tool", { detail: x })), id);
    await page.waitForTimeout(150);
    await measure();
    await page.evaluate(() => { const b = window.Kort.$$("[data-back]").find((x) => x.checkVisibility()); if (b) b.click(); });
  }
  return Array.from(found);
}

const browser = await chromium.launch();
const report = {};
for (const [key, plan] of Object.entries(PLAN)) {
  if (only && only !== key) continue;
  for (const [name, vp, query, steps] of plan.shots) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.mobile ? 2 : 1,
      isMobile: vp.mobile, hasTouch: vp.mobile, locale: "da-DK", colorScheme: "light",
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const url = pathToFileURL(path.join(protoDir, plan.dir, "index.html")).href + "?ren=1" + (query ? "&" + query : "");
    const id = `${key}-${vp.name}-${name}`;
    try {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      for (const s of steps) await s(page);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, `${id}.png`) });
      const small = vp.mobile ? await smallTargets(page) : [];
      report[id] = { errors, small };
      console.log(id, errors.length ? "FEJL " + errors.join(" | ") : "ok", small.length ? `små mål: ${small.length}` : "");
    } catch (e) {
      console.log(id, "FEJL", String(e).slice(0, 300));
      report[id] = { errors: [String(e).slice(0, 300)] };
    }
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: { width: MOBILE.width, height: MOBILE.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "da-DK" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(pathToFileURL(path.join(protoDir, plan.dir, "index.html")).href + "?ren=1", { waitUntil: "networkidle" });
  const small = await sweep(page);
  report[`${key}-mobil-alle-tilstande`] = { errors, small };
  console.log(`${key}-mobil-alle-tilstande`, errors.length ? "FEJL " + errors.join(" | ") : "ok", small.length ? `små mål: ${small.join("; ")}` : "");
  await ctx.close();
}
fs.writeFileSync(path.join(outDir, `rapport${only ? "-" + only : ""}.json`), JSON.stringify(report, null, 2));
await browser.close();
