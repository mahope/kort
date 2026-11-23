// Screenshots for the søkort layer (phase 2): desktop, mobile and page 1 of the
// app's own A4 PDF at 300 dpi, before (production, old WMS layers) and after
// (this build, both variants), for one brand per run.
//
//   KORT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
//     node scripts/soekort/capture-fase2.mjs <mahoje|solaris> <foer|efter>
//
// ONLY=svendborgsund,furesoe limits the views.
//
// "efter" starts `next start` on a free port from the current build (build
// with NEXT_PUBLIC_BRAND=<brand> first) and stops it again; the Datafordeler key
// is read from ~/.config/kort/datafordeler.key and only passed to the server.
// "foer" shoots kort.mahoje.dk / kort.solaris.dk. PDF pages go through
// pdftoppm in the kort-ddm Docker image (scripts/soekort/ddm-pmtiles).
import { execFileSync, spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toWebp } from "./ddm-pmtiles/preview/webp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUT = process.env.OUT || path.join(ROOT, "docs/screenshots/soekort-fase2");
const [brand, mode] = process.argv.slice(2);
if (!["mahoje", "solaris"].includes(brand) || !["foer", "efter"].includes(mode)) {
  console.error("usage: capture-fase2.mjs <mahoje|solaris> <foer|efter>");
  process.exit(2);
}
const { chromium } = await import(process.env.KORT_PLAYWRIGHT_MODULE || "playwright");

const SITES = [
  { name: "svendborgsund", lat: 55.0505, lng: 10.615, scale: 25000 },
  { name: "sydfynske-oehav", lat: 54.93, lng: 10.56, scale: 50000 },
  { name: "limfjorden-loegstoer", lat: 56.98, lng: 9.22, scale: 50000 },
  { name: "furesoe", lat: 55.798, lng: 12.405, scale: 10000 },
];

/** What to shoot: before = the old depth layers in production; after = both variants, plus the lines over DTK25. */
const STATES =
  mode === "foer"
    ? [{ tag: "foer", ov: "dd,sd", base: "sk" }]
    : [
        { tag: "klassisk", ov: "sk", base: "sk" },
        { tag: "lavvande", ov: "sk", base: "sk", extra: "&sv=lv" },
        { tag: "klassisk-dtk25", ov: "sk", base: "dtk", sites: ["svendborgsund"], pdf: false },
      ];

/** Screen zoom (MapLibre, 512 px tiles) for a scale at 96 dpi. */
const screenZoom = (lat, scale) => Math.log2((Math.cos((lat * Math.PI) / 180) * 40075016.686) / (512 * ((scale * 0.0254) / 96)));

const freePort = () =>
  new Promise((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

async function startServer() {
  const port = await freePort();
  const key = (await readFile(path.join(homedir(), ".config/kort/datafordeler.key"), "utf8")).trim();
  const child = spawn(path.join(ROOT, "node_modules/.bin/next"), ["start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: ROOT,
    env: { ...process.env, DATAFORDELER_API_KEY: key },
    stdio: ["ignore", "ignore", "inherit"],
  });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return { url, stop: () => child.kill("SIGTERM") };
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill("SIGTERM");
  throw new Error("next start did not answer");
}

const server = mode === "efter" ? await startServer() : null;
const origin = server ? server.url : brand === "mahoje" ? "https://kort.mahoje.dk" : "https://kort.solaris.dk";
await mkdir(OUT, { recursive: true });
const tmp = await mkdtemp(path.join(tmpdir(), "soekort-fase2-"));
const browser = await chromium.launch({ headless: true });

const query = (s, st) =>
  `c=${s.lat.toFixed(5)},${s.lng.toFixed(5)},${screenZoom(s.lat, s.scale).toFixed(1)}&l=${st.base}&s=${s.scale}&f=A4&o=p&d=300&ov=${st.ov}${st.extra ?? ""}`;

async function settle(page) {
  await page.locator(".maplibregl-canvas").first().waitFor();
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);
}

try {
  // Old links: ?ov=dd,sd must turn into the søkort (the address bar is rewritten from the store).
  if (server) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${origin}/?${query(SITES[0], { ov: "dd,sd", base: "sk" })}`);
    await page.waitForTimeout(3000);
    const ov = new URL(page.url()).searchParams.get("ov");
    console.log(`old link ov=dd,sd -> ov=${ov}`);
    if (!ov?.startsWith("sk")) throw new Error("old link did not open the søkort");
    await ctx.close();
  }

  for (const st of STATES) {
    const only = process.env.ONLY?.split(",");
    for (const s of SITES.filter((x) => (!st.sites || st.sites.includes(x.name)) && (!only || only.includes(x.name)))) {
      const name = `${brand}-${s.name}-${st.tag}`;
      const q = query(s, st);

      const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, colorScheme: "light" });
      const page = await desktop.newPage();
      await page.goto(`${origin}/?${q}`, { waitUntil: "domcontentloaded" });
      await settle(page);
      await writeFile(path.join(OUT, `${name}-desktop.webp`), await toWebp(browser, await page.screenshot({ type: "png" }), 0.8));

      if (st.pdf !== false) {
        const download = page.waitForEvent("download", { timeout: 300000 });
        await page.getByRole("button", { name: /Download PDF/ }).first().click();
        const pdf = path.join(tmp, `${name}.pdf`);
        await (await download).saveAs(pdf);
        execFileSync("docker", ["run", "--rm", "-u", `${process.getuid()}:${process.getgid()}`, "-v", `${tmp}:/t`, "kort-ddm",
          "pdftoppm", "-f", "1", "-l", "1", "-r", "300", "-png", "-singlefile", `/t/${name}.pdf`, `/t/${name}`]);
        const page1 = await readFile(path.join(tmp, `${name}.png`));
        // The whole page at half size, and a 1400 x 900 px crop at 100 % from the centre.
        await writeFile(path.join(OUT, `${name}-a4.webp`), await toWebp(browser, page1, 0.8, { scale: 0.5 }));
        await writeFile(path.join(OUT, `${name}-a4-udsnit.webp`), await toWebp(browser, page1, 0.85, { centre: [1400, 900] }));
      }
      await desktop.close();

      const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "light" });
      const mpage = await mobile.newPage();
      await mpage.goto(`${origin}/?${q}`, { waitUntil: "domcontentloaded" });
      await settle(mpage);
      await writeFile(path.join(OUT, `${name}-mobil.webp`), await toWebp(browser, await mpage.screenshot({ type: "png" }), 0.8, { scale: 0.5 }));
      await mobile.close();
      console.log(`${name}: ${q}`);
    }
  }
} finally {
  await browser.close();
  await rm(tmp, { recursive: true, force: true });
  server?.stop();
}
