// Render cases through headless Chrome over CDP (localhost only) and save PNGs.
//   DF_TOKEN=<public token from src/lib/map/styles.ts> node shoot.mjs <cases.json> <tilesDir> <outDir>
// cases.json: [{ "name", "src", "lon", "lat", "scale", "dpi", "w", "h" }]
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serve } from "./serve.mjs";

const [casesFile, tilesDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const cases = JSON.parse(readFileSync(casesFile, "utf8"));
const nodeModules = new URL("../../../../../node_modules/", import.meta.url).pathname;
const server = await serve({ nodeModules, tilesDir });
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), "kort-render-"));
const chrome = spawn("google-chrome", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
  "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=1600,1200", "about:blank"], { stdio: "ignore" });
const portFile = join(profile, "DevToolsActivePort");
for (let i = 0; i < 100 && !existsSync(portFile); i++) await new Promise((r) => setTimeout(r, 100));
const port = readFileSync(portFile, "utf8").split("\n")[0];
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (m) => {
  const d = JSON.parse(m.data);
  if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") console.error("page exception:", JSON.stringify(d.params.exceptionDetails).slice(0, 400));
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") console.error("page console:", JSON.stringify(d.params.args).slice(0, 300));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.result?.value;

await send("Runtime.enable");
const summary = [];
for (const c of cases) {
  const q = new URLSearchParams({ token: process.env.DF_TOKEN || "", src: c.src, lon: c.lon, lat: c.lat, scale: c.scale, dpi: c.dpi, w: c.w, h: c.h, textsize: c.textsize || 11 });
  await send("Page.navigate", { url: `${origin}/?${q}` });
  let r = null;
  for (let i = 0; i < (Number(process.env.WAIT) || 900) && !r; i++) { await new Promise((res) => setTimeout(res, 100)); r = await evalJs("window.__result || null"); }
  const errors = await evalJs("window.__errors || []");
  if (!r) console.error("debug:", await evalJs(`JSON.stringify({ map: !!window.__map, loaded: window.__map?.loaded(), style: window.__map?.isStyleLoaded(), gl: !!document.createElement('canvas').getContext('webgl2'), tiles: window.__map ? window.__map.areTilesLoaded() : null })`));
  if (!r) { summary.push({ name: c.name, error: "timeout", errors }); continue; }
  writeFileSync(join(outDir, `${c.name}.png`), Buffer.from(r.png.split(",")[1], "base64"));
  summary.push({ name: c.name, src: c.src, zoom: +r.zoom.toFixed(3), groundRes: +r.groundRes.toFixed(3), ms: r.ms, tileZooms: r.tileZooms, errors });
  console.log(JSON.stringify(summary.at(-1)));
}
writeFileSync(join(outDir, "render-summary.json"), JSON.stringify(summary, null, 1));
ws.close(); chrome.kill(); server.close();
await new Promise((r) => chrome.once("exit", r));
rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
