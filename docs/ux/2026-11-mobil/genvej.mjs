// Tool shortcut check: a fresh mobile visit can reach "Flersidet udskrift" with one tap.
import { createRequire } from "node:module";
const require = createRequire("/home/mads/dev/shots/");
const { chromium } = require("playwright");
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(base, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Flere ark" }).click();
await page.waitForTimeout(1200);
const cb = page.getByText("Flersidet udskrift");
const box = await cb.boundingBox();
const ok = box && box.y > 0 && box.y + box.height < 844;
console.log(ok ? "PASS genvej Flere ark viser Flersidet udskrift" : `FAIL genvej (${JSON.stringify(box)})`);
await page.screenshot({ path: out });
await browser.close();
process.exit(ok ? 0 : 1);
