// Behaviour checks for the prototypes: credit, preview rotation, keyboard focus,
// mobile modal and the sheet handle. Exits 1 if one fails.
// node adfaerd.mjs   (PW_DIR = folder with a playwright install)
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire((process.env.PW_DIR || "/home/mads/dev/shots") + "/");
const { chromium } = require("playwright");

const protoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../prototyper");
const url = (dir, query = "?ren=1") => pathToFileURL(path.join(protoDir, dir, "index.html")).href + query;
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

const browser = await chromium.launch();
let failed = 0;
async function check(name, dir, opts, fn) {
  const { url: query, ...ctxOpts } = opts;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(url(dir, query), { waitUntil: "networkidle" });
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

// Tabs 40 times in the open mobile layer panel. Focus may pass body once per lap
// (Chromium leaves the page after the last element), but never land behind the
// panel, and the panel's own controls must actually be reached.
async function tabStaysInPanel(p) {
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press("Tab");
    const where = await p.evaluate(() => {
      const a = document.activeElement;
      if (a === document.body) return "body";
      return a.closest("#layerpanel") ? "panel:" + (a.id || a.dataset.focus || a.tagName) : "bag:" + a.outerHTML.slice(0, 60);
    });
    expect(!where.startsWith("bag:"), "fokus bag panelet: " + where);
    seen.add(where);
  }
  expect(seen.has("panel:close-layers"), "Luk fik aldrig fokus: " + Array.from(seen).join(" "));
  expect([...seen].some((s) => s.startsWith("panel:base-")), "intet basiskort fik fokus: " + Array.from(seen).join(" "));
}

await check("A mobil: lagpanelet kan bruges med Tab og tryk, og intet bag det kan nås", "a-formaal", MOBILE, async (p) => {
  await p.tap("#open-layers-map");
  await tabStaysInPanel(p);
  await p.locator("#layerpanel [data-focus='base-ortofoto']").tap({ timeout: 2000 });
  expect(await p.evaluate(() => window.Kort.state.base) === "ortofoto", "basiskort blev ikke valgt ved tryk");
  await p.locator("#close-layers").tap({ timeout: 2000 });
  expect(await p.locator("#layerpanel").isHidden(), "Luk lukkede ikke panelet");
});

await check("C: Overlap-skyderen kan trækkes i ét træk fra 10 til 20 mm", "c-trin", DESKTOP, async (p) => {
  await p.getByRole("tab", { name: /Print/ }).click();
  await p.click("#exp-print");
  await p.click("[data-focus='multi']");
  const r = await p.locator("#overlap").boundingBox();
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) await p.mouse.move(r.x + r.width / 2 + (i * r.width) / 10, r.y + r.height / 2);
  const during = await p.evaluate(() => [window.Kort.state.overlap, document.querySelector("label[for=overlap] .hint").textContent]);
  await p.mouse.up();
  expect(during[0] === 20 && during[1] === "20 mm", "under trækket: " + during);
  const after = await p.evaluate(() => [window.Kort.state.overlap, document.querySelector("#overlap").value]);
  expect(after[0] === 20 && after[1] === "20", "efter slip: " + after);
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

for (const dir of ["a-formaal", "b-lagpanel", "c-trin"]) {
  await check(`${dir} mobil: Datakilder kan trykkes i hele sin højde`, dir, MOBILE, async (p) => {
    const missed = await p.evaluate(() => {
      const a = document.querySelector(".attrib a");
      const r = a.getBoundingClientRect();
      const out = [];
      for (let y = Math.ceil(r.top) + 1; y < r.bottom - 1; y++) {
        const t = document.elementFromPoint(r.left + r.width / 2, y);
        if (!(t && a.contains(t))) out.push(y);
      }
      return out.length + " af " + Math.round(r.height - 2);
    });
    expect(missed.startsWith("0 "), "punkter uden for linket: " + missed);
  });
}

await check("A mobil uden ?ren=1: prototypelinjen er bag dæmpningen, og skift til desktop ophæver den", "a-formaal", { ...MOBILE, url: "" }, async (p) => {
  await p.click("#open-layers-map");
  await tabStaysInPanel(p);
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.waitForTimeout(200);
  const s = await p.evaluate(() => ({ scrim: document.querySelector("#scrim").hidden, inert: !!document.querySelector("#side").inert, bar: !!(document.querySelector(".protobar") || {}).inert }));
  expect(s.scrim && !s.inert && !s.bar, "efter skift til desktop: " + JSON.stringify(s));
});

await check("A: Vandretur holder UTM; et andet koordinatsystem gør det til Eget valg, og Vandretur sætter UTM igen", "a-formaal", DESKTOP, async (p) => {
  await p.click(".prow[data-p='vandretur']");
  await p.click("#open-layers-map");
  await p.evaluate(() => { const K = window.Kort; K.$$("[data-widget=layers]").forEach((el) => { el.dataset.open = "gitter"; K.renderWidget(el); }); });
  await p.locator("#gridsys").first().selectOption("mgrs");
  let st = await p.evaluate(() => [window.Kort.state.preset, window.Kort.state.gridSystem]);
  expect(st[0] === "eget", "formål efter MGRS: " + st);
  await p.click(".prow[data-p='vandretur']");
  st = await p.evaluate(() => [window.Kort.state.preset, window.Kort.state.gridSystem]);
  expect(st[0] === "vandretur" && st[1] === "utm", "efter Vandretur igen: " + st);
});

await check("C: større overlap flytter arkene i forhåndsvisningen og på kortet", "c-trin", DESKTOP, async (p) => {
  await p.getByRole("tab", { name: /Print/ }).click();
  await p.evaluate(() => window.Kort.set({ multi: true, cols: 2, rows: 2, overlap: 10 }));
  const read = () => p.evaluate(() => ({
    pv: Array.from(document.querySelectorAll(".pv-img")).map((e) => e.style.left + "," + e.style.top).join(" "),
    frame: Array.from(document.querySelectorAll(".frame .sheet")).map((e) => e.style.left + "," + e.style.width).join(" "),
  }));
  const before = await read();
  await p.evaluate(() => window.Kort.set({ overlap: 20 }));
  const after = await read();
  expect(before.pv !== after.pv, "forhåndsvisningens ark er uændrede: " + after.pv);
  expect(before.frame !== after.frame, "arkene på kortet er uændrede: " + after.frame);
});

await browser.close();
process.exit(failed ? 1 : 0);
