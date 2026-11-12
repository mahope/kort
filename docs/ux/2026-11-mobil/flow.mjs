// Mobile/desktop flow screenshots for kort.
// node flow.mjs <baseUrl> <outDir> <prefix>
// Flow: start -> search a place -> pick result -> sheet open (scale/paper) -> advanced -> PDF progress.
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/home/mads/dev/shots/");
const { chromium } = require("playwright");

const [base, outDir, prefix] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844, mobile: true, scheme: "light" },
  { name: "390x844-dark", width: 390, height: 844, mobile: true, scheme: "dark" },
  { name: "360x800", width: 360, height: 800, mobile: true, scheme: "light" },
  { name: "1440x900", width: 1440, height: 900, mobile: false, scheme: "light" },
];
const only = process.env.ONLY;
const report = {};
const browser = await chromium.launch();

async function smallTargets(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("button, a, select, input, [role=button], summary, label:has(input)")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (el.matches("input[type=checkbox], input[type=radio]") && el.closest("label")) continue;
      if (r.height < 44 || r.width < 44) {
        out.push({
          tag: el.tagName.toLowerCase(),
          text: (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "").trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
    }
    return out;
  });
}

async function shot(page, vp, step) {
  const file = `${outDir}/${prefix}-${vp.name}-${step}.png`;
  await page.screenshot({ path: file });
  return file;
}

for (const vp of VIEWPORTS) {
  if (only && !vp.name.includes(only)) continue;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    colorScheme: vp.scheme,
    acceptDownloads: true,
    locale: "da-DK",
  });
  const page = await ctx.newPage();
  const r = (report[vp.name] = { steps: {} });
  try {
    await page.goto(base, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);
    await shot(page, vp, "01-start");
    r.steps.start = { small: await smallTargets(page) };

    const search = page.getByRole("combobox").first();
    await search.click();
    await search.fill("Rold Skov");
    await page.waitForTimeout(2500);
    await shot(page, vp, "02-soeg");
    const opt = page.getByRole("option").first();
    if (await opt.count()) {
      await opt.click();
      await page.waitForTimeout(3500);
    } else {
      await search.press("Enter");
      await page.waitForTimeout(3500);
    }
    await shot(page, vp, "03-valgt-sted");

    // Scroll settings (scale/paper) into view.
    const scaleLabel = page.getByText("Målestok", { exact: true }).first();
    if (await scaleLabel.count()) await scaleLabel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await shot(page, vp, "04-maalestok-papir");
    r.steps.settings = { small: await smallTargets(page) };

    const adv = page.getByRole("button", { name: /Alle indstillinger|Avancerede indstillinger/ }).first();
    if (await adv.count()) {
      await adv.scrollIntoViewIfNeeded();
      await adv.click();
      await page.waitForTimeout(600);
      await shot(page, vp, "05-avanceret");
      r.steps.advanced = { small: await smallTargets(page) };
    }

    const dl = page.getByRole("button", { name: /Download PDF/ }).first();
    const t0 = Date.now();
    const dlPromise = page.waitForEvent("download", { timeout: 120000 });
    dlPromise.catch(() => {});
    await dl.click();
    await page.waitForTimeout(1500);
    await shot(page, vp, "06-pdf-fremdrift");
    const download = await dlPromise;
    const pdfPath = `${outDir}/${prefix}-${vp.name}.pdf`;
    await download.saveAs(pdfPath);
    r.pdf = { file: pdfPath, ms: Date.now() - t0, bytes: fs.statSync(pdfPath).size };
    await page.waitForTimeout(800);
    await shot(page, vp, "07-efter-pdf");
  } catch (e) {
    r.error = String(e).slice(0, 400);
    await shot(page, vp, "99-fejl").catch(() => {});
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${outDir}/${prefix}-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, (k, v) => (k === "small" ? v.length : v), 2));
