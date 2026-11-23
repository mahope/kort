// Reference screenshots of the current app, plus clean map backgrounds for the prototypes.
// node current.mjs <outDir> [step]   (PW_DIR = folder with a playwright install)
//   step "nu"   : screenshots of kort.mahoje.dk / kort.solaris.dk as they are today
//   step "kort" : map-only images (no UI) used as static backgrounds in the prototypes
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire((process.env.PW_DIR || "/home/mads/dev/shots") + "/");
const { chromium } = require("playwright");

const [outDir, step = "nu"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
// Mols Bjerge: hills, forest, coast and sea in one view.
const VIEW = "c=56.2150,10.5600,13.1";
const browser = await chromium.launch();

async function context(vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: vp.dpr ?? 1,
    isMobile: !!vp.mobile,
    hasTouch: !!vp.mobile,
    colorScheme: vp.dark ? "dark" : "light",
    locale: "da-DK",
  });
  if (vp.dark) await ctx.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch {} });
  return ctx;
}

async function open(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(3500);
}

if (step === "nu") {
  const sites = [
    { id: "mahoje", base: "https://kort.mahoje.dk/" },
    { id: "solaris", base: "https://kort.solaris.dk/" },
  ];
  for (const site of sites) {
    const vps = [
      { name: "1440x900", w: 1440, h: 900 },
      { name: "390x844", w: 390, h: 844, dpr: 2, mobile: true },
      ...(site.id === "mahoje" ? [{ name: "1440x900-dark", w: 1440, h: 900, dark: true }] : []),
    ];
    for (const vp of vps) {
      const ctx = await context(vp);
      const page = await ctx.newPage();
      const shot = (n) => page.screenshot({ path: `${outDir}/nu-${site.id}-${vp.name}-${n}.png` });
      try {
        await open(page, `${site.base}?${VIEW}`);
        await shot("01-start");
        // The layer menu over the map.
        await page.getByRole("button", { name: "Kortlag" }).first().click();
        await page.waitForTimeout(800);
        await shot("02-kortlag");
        if (site.id === "mahoje" && !vp.dark) {
          const panel = page.locator("div.max-h-\\[70vh\\]").first();
          await panel.evaluate((el) => (el.scrollTop = el.scrollHeight));
          await page.waitForTimeout(400);
          await shot("03-kortlag-bund");
        }
        await page.mouse.click(vp.w - 40, vp.mobile ? 120 : 450);
        await page.waitForTimeout(400);
        if (vp.mobile) {
          // Pull the sheet up to its max position via the handle.
          const box = await page.locator("[data-sheet-handle]").boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            for (let y = box.y; y > 80; y -= 40) await page.mouse.move(box.x + box.width / 2, y);
            await page.mouse.up();
          }
          await page.waitForTimeout(800);
          await shot("04-panel");
        }
        const adv = page.getByRole("button", { name: /Alle indstillinger/ }).first();
        await adv.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await shot("05-vaerktoejer");
        await adv.click();
        await page.waitForTimeout(800);
        await shot("06-avanceret");
        // Scroll the panel to the bottom to show how long it gets.
        await page.locator("aside").first().evaluate((el) => {
          const sc = [el, ...el.querySelectorAll("*")].find((n) => n.scrollHeight > n.clientHeight + 20 && getComputedStyle(n).overflowY !== "visible");
          if (sc) sc.scrollTop = sc.scrollHeight;
        });
        await page.waitForTimeout(500);
        await shot("07-avanceret-bund");
        const height = await page.locator("aside").first().evaluate((el) => {
          const sc = [el, ...el.querySelectorAll("*")].find((n) => n.scrollHeight > n.clientHeight + 20 && getComputedStyle(n).overflowY !== "visible");
          return sc ? sc.scrollHeight : el.scrollHeight;
        });
        console.log(site.id, vp.name, "panel scrollHeight", height);
      } catch (e) {
        console.log("FEJL", site.id, vp.name, String(e).slice(0, 300));
        await shot("99-fejl").catch(() => {});
      }
      await ctx.close();
    }
  }
}

if (step === "kort") {
  // A huge print frame (1:1.000.000 on A0) lies outside the view, so neither its
  // outline nor its mask shows. The UI is hidden with CSS.
  const FRAME = "s=1000000&f=A0";
  const maps = [
    { id: "dtk25", q: "l=dtk" },
    { id: "skaermkort", q: "l=sk" },
    { id: "daempet", q: "l=sk&v=da" },
    { id: "ortofoto", q: "l=of" },
    { id: "lave", q: "l=hl" },
    { id: "hoeje", q: "l=hh" },
    { id: "osm", q: "l=osm" },
    { id: "kurver", q: "l=sk&v=da&ov=k5-100" },
    { id: "sejlads", q: "l=sk&ov=hd-70,sm-100" },
  ];
  const hide = `aside, .maplibregl-ctrl, [class*="absolute"][class*="z-"], .maplibregl-ctrl-attrib, .maplibregl-marker { display: none !important; }
    main > *:not(:first-child) { display: none !important; }`;
  const ctx = await context({ w: 1600, h: 1000 });
  const page = await ctx.newPage();
  for (const m of maps.filter((m) => !process.env.ONLY || m.id === process.env.ONLY)) {
    try {
      await open(page, `https://kort.mahoje.dk/?${VIEW}&${FRAME}&${m.q}`);
      await page.addStyleTag({ content: hide });
      await page.waitForTimeout(Number(process.env.WAIT || 6000));
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.screenshot({ path: `${outDir}/kort-${m.id}.png` });
      console.log("ok", m.id, page.url());
    } catch (e) {
      console.log("FEJL", m.id, String(e).slice(0, 300));
    }
  }
  await ctx.close();
}
await browser.close();
