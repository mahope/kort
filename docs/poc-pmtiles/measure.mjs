// PoC measurement: starts `next start` + serve.mjs on localhost, measures PMTiles range-request
// behaviour with the same pmtiles lib the app uses (FetchSource = what Protocol uses), then
// renders /poc-pmtiles in headless Chrome and prints the range requests the browser made.
//   node docs/poc-pmtiles/measure.mjs <dataDir> <pmtilesLibDir>
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const [dataDir, libDir] = process.argv.slice(2);
const { PMTiles, FetchSource } = await import(pathToFileURL(`${libDir}/node_modules/pmtiles/dist/esm/index.js`).href);
const repo = process.cwd();
const procs = [];
const start = (cmd, args, opts = {}) => { const p = spawn(cmd, args, { stdio: "ignore", ...opts }); procs.push(p); return p; };
const waitPort = async (port) => { for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port}/`); return; } catch { await sleep(500); } } throw new Error(`port ${port}`); };

const BASE = "http://127.0.0.1:8099";
try {
  start("npx", ["next", "start", "-p", "3000"], { cwd: repo });
  start("node", [`${repo}/docs/poc-pmtiles/serve.mjs`, dataDir, "8099", "3000"]);
  await waitPort(8099); await sleep(1500); await waitPort(3000);

  const url = `${BASE}/tiles/nsj-vector.pmtiles`;
  const headRes = await fetch(url, { method: "HEAD" });
  console.log("HEAD headers:", Object.fromEntries(["cache-control", "etag", "accept-ranges", "content-length", "content-type"].map((h) => [h, headRes.headers.get(h)])));
  const r = await fetch(url, { headers: { Range: "bytes=0-16383" } });
  console.log("Range 0-16383 ->", r.status, r.headers.get("content-range"), (await r.arrayBuffer()).byteLength, "bytes");

  const tx = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
  const ty = (lat, z) => { const q = (lat * Math.PI) / 180; return Math.floor(((1 - Math.log(Math.tan(q) + 1 / Math.cos(q)) / Math.PI) / 2) * 2 ** z); };
  const view = (z, nx, ny) => { const cx = tx(12.3, z), cy = ty(55.93, z), out = []; for (let x = cx - (nx >> 1); x < cx - (nx >> 1) + nx; x++) for (let y = cy - (ny >> 1); y < cy - (ny >> 1) + ny; y++) out.push([z, x, y]); return out; };

  async function run(label, tiles, p, cold) {
    await fetch(`${BASE}/__log`); // reset server log
    const t0 = performance.now();
    let first = null, bytes = 0;
    for (const [z, x, y] of tiles) {
      const tt = performance.now();
      const t = await p.getZxy(z, x, y);
      if (first === null) first = performance.now() - tt;
      if (t) bytes += t.data.byteLength;
    }
    const total = performance.now() - t0;
    const log = await (await fetch(`${BASE}/__log`)).json();
    console.log(`${label}: tiles=${tiles.length} first=${first.toFixed(1)}ms total=${total.toFixed(1)}ms rangeRequests=${log.length} wireBytes=${log.reduce((a, b) => a + b.bytes, 0)} tileBytes(decompressed)=${bytes}`);
  }
  // typical viewport 1280x800 at z14 = 6x4 tiles of 256px (vector tiles are 512px-equivalent, so also 3x2 at z13)
  const vp = view(14, 6, 4);
  await run("PMTiles z14 viewport 6x4 COLD (new instance, no cache)", vp, new PMTiles(new FetchSource(url)), true);
  const warm = new PMTiles(new FetchSource(url));
  await run("PMTiles z14 viewport 6x4 cold #2", vp, warm, true);
  await run("PMTiles z14 viewport 6x4 WARM (header+dirs cached in instance)", vp, warm, false);
  await run("PMTiles z15 viewport 6x4 with warm dirs", view(15, 6, 4), warm, false);
  const all = [];
  for (let z = 10; z <= 15; z++) for (let x = tx(11.9, z); x <= tx(12.6, z); x++) for (let y = ty(56.2, z); y <= ty(55.8, z); y++) all.push([z, x, y]);
  await run("PMTiles ALL tiles z10-15 in bbox (sequential)", all, new PMTiles(new FetchSource(url)), true);

  // Browser render (headless Chrome, localhost only). Console/screens saved next to the data.
  const shot = `${dataDir}/poc-pmtiles-screenshot.png`;
  await fetch(`${BASE}/__log`);
  // Raw CDP (Node's global WebSocket) so we can wait until MapLibre reports tiles loaded.
  const chrome = start("google-chrome", ["--headless=new", "--remote-debugging-port=9222", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist", "--window-size=1280,800", "--user-data-dir=/tmp/poc-pmtiles-chrome", "about:blank"]);
  let targets;
  for (let i = 0; i < 40; i++) { try { targets = await (await fetch("http://127.0.0.1:9222/json")).json(); break; } catch { await sleep(500); } }
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await cdp("Page.enable");
  const tn = Date.now();
  await cdp("Page.navigate", { url: `${BASE}/poc-pmtiles?z=14` });
  let loaded = false, ms = 0;
  for (let i = 0; i < 60 && !loaded; i++) {
    await sleep(500);
    const v = (await cdp("Runtime.evaluate", { expression: "window.__map && window.__map.loaded() && window.__map.areTilesLoaded()", returnByValue: true })).result?.result?.value;
    if (v) { loaded = true; ms = Date.now() - tn; }
  }
  console.log("browser: map loaded =", loaded, "after ~", ms, "ms (incl. page load, polling 500ms)");
  const png = (await cdp("Page.captureScreenshot", { format: "png" })).result.data;
  (await import("node:fs")).writeFileSync(`${dataDir}/poc-pmtiles-screenshot.png`, Buffer.from(png, "base64"));
  ws.close(); chrome.kill("SIGTERM");
  const blog = await (await fetch(`${BASE}/__log`)).json();
  console.log("browser range requests:", blog.length, "wire bytes:", blog.reduce((a, b) => a + b.bytes, 0));
  console.log(blog.slice(0, 8).map((b) => `${b.code} ${b.range} ${b.bytes}`).join("\n"));
} finally {
  for (const p of procs) p.kill("SIGTERM");
}
