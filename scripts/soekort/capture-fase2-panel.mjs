// The søkort's style choice in the map's layer menu (desktop and mobile),
// for one brand per run, from the current build (see capture-fase2.mjs).
//
//   KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/soekort/capture-fase2-panel.mjs <mahoje|solaris>
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toWebp } from "./ddm-pmtiles/preview/webp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUT = process.env.OUT || path.join(ROOT, "docs/screenshots/soekort-fase2");
const brand = process.argv[2];
const { chromium } = await import(process.env.KORT_PLAYWRIGHT_MODULE || "playwright");

const port = await new Promise((resolve) => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => resolve(p));
  });
});
const key = (await readFile(path.join(homedir(), ".config/kort/datafordeler.key"), "utf8")).trim();
const child = spawn(path.join(ROOT, "node_modules/.bin/next"), ["start", "-p", String(port), "-H", "127.0.0.1"], {
  cwd: ROOT,
  env: { ...process.env, DATAFORDELER_API_KEY: key },
  stdio: ["ignore", "ignore", "ignore"],
});
const origin = `http://127.0.0.1:${port}`;
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  const q = "c=54.93000,10.56000,11.7&l=sk&s=50000&f=A4&o=p&d=300&ov=sk&sv=lv";

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await desktop.newPage();
  await page.goto(`${origin}/?${q}`);
  await page.waitForTimeout(6000);
  await page.getByRole("button", { name: /Kortlag/ }).first().click();
  await page.waitForTimeout(800);
  const group = page.getByRole("group", { name: "Søkortets stil" });
  console.log("desktop groups:", await group.count());
  await group.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(500);
  await writeFile(path.join(OUT, `${brand}-panel-desktop.webp`), await toWebp(browser, await page.screenshot({ type: "png" }), 0.85));
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "light" });
  const mpage = await mobile.newPage();
  await mpage.goto(`${origin}/?${q}`);
  await mpage.waitForTimeout(6000);
  // Open the layer panel from the map's layer button, as a user would.
  await mpage.getByRole("button", { name: /Kortlag/ }).first().click();
  await mpage.waitForTimeout(1000);
  const mgroup = mpage.getByRole("group", { name: "Søkortets stil" });
  console.log("mobile groups:", await mgroup.count());
  await mgroup.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
  await mpage.waitForTimeout(800);
  await writeFile(path.join(OUT, `${brand}-panel-mobil.webp`), await toWebp(browser, await mpage.screenshot({ type: "png" }), 0.85, { scale: 0.5 }));
  await mobile.close();
} finally {
  await browser.close();
  child.kill("SIGTERM");
}
