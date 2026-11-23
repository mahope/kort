// Behaviour checks for the prototypes: credit, preview rotation, keyboard focus,
// mobile modal and the sheet handle. Exits 1 if one fails.
// node adfaerd.mjs   (PW_DIR = folder with a playwright install)
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire((process.env.PW_DIR || "/home/mads/dev/shots") + "/");
const { chromium } = require("playwright");

const protoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../prototyper");
const url = (dir) => pathToFileURL(path.join(protoDir, dir, "index.html")).href + "?ren=1";
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

const browser = await chromium.launch();
let failed = 0;
async function check(name, dir, opts, fn) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(url(dir), { waitUntil: "networkidle" });
  try {
    await fn(page);
    console.log("ok  ", name);
  } catch (e) {
    failed++;
    console.log("FEJL", name, String(e.message || e).split("\n")[0]);
  }
  await ctx.close();
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }
const credit = (p) => p.locator(".attrib [data-credit]").textContent();

await check("A: Sejlads krediterer EMODnet og OpenSeaMap, også når sømærker slås fra", "a-formaal", DESKTOP, async (p) => {
  await p.click(".prow[data-p='sejlads']");
  let c = await credit(p);
  expect(c.includes("EMODnet") && c.includes("OpenSeaMap"), "kreditering: " + c);
  await p.evaluate(() => window.Kort.setOverlay("soemaerker", { on: false }));
  c = await credit(p);
  expect(c.includes("OpenSeaMap") && c.includes("EMODnet"), "efter sømærker fra: " + c);
});

await check("A: manuel målestok gør formålet til Eget valg", "a-formaal", DESKTOP, async (p) => {
  await p.click(".prow[data-p='vandretur']");
  await p.getByRole("radio", { name: "1:50.000", exact: true }).first().click();
  const checked = await p.locator(".prow[aria-checked=true]").getAttribute("data-p");
  expect(checked === "eget", "markeret formål: " + checked);
});

await check("B: piletaster flytter fokus med baggrundskortet", "b-lagpanel", MOBILE, async (p) => {
  await p.evaluate(() => window.__open.sheet.set("max"));
  await p.getByRole("tab", { name: /Kortlag/ }).click();
  await p.locator("#pane-kort [data-focus='base-dtk25']").focus();
  await p.keyboard.press("ArrowRight");
  await p.keyboard.press("ArrowRight");
  const f = await p.evaluate(() => [document.activeElement.dataset.focus, document.activeElement.getAttribute("aria-checked")]);
  expect(f[0] === "base-ortofoto" && f[1] === "true", "fokus: " + f);
});

await check("C: forhåndsvisningen drejer kortet modsat rammen", "c-trin", DESKTOP, async (p) => {
  await p.getByRole("tab", { name: /Print/ }).click();
  await p.evaluate(() => window.Kort.set({ rotation: 45 }));
  const t = await p.locator(".pv-img").first().evaluate((el) => el.style.transform);
  expect(t === "rotate(-45deg)", "transform: " + t);
});

await check("A mobil: Tab bliver i lagpanelet, mens det er åbent", "a-formaal", MOBILE, async (p) => {
  await p.click("#open-layers-map");
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press("Tab");
    const where = await p.evaluate(() => {
      const a = document.activeElement;
      return a.closest("#layerpanel") ? "panel" : a.closest(".protobar") || a === document.body ? "udenfor-design" : a.outerHTML.slice(0, 60);
    });
    expect(where === "panel" || where === "udenfor-design", "fokus bag panelet: " + where);
  }
});

await check("Mobil: Enter på panelhåndtaget skifter størrelse", "c-trin", MOBILE, async (p) => {
  const before = await p.locator("#side").getAttribute("data-pos");
  await p.locator(".grabber").focus();
  await p.keyboard.press("Enter");
  const after = await p.locator("#side").getAttribute("data-pos");
  expect(before !== after, `før ${before}, efter ${after}`);
  await p.keyboard.press(" ");
  const again = await p.locator("#side").getAttribute("data-pos");
  expect(again === before, `mellemrum: ${again}`);
});

await browser.close();
process.exit(failed ? 1 : 0);
