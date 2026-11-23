// Local preview server for soekort.pmtiles. Serves the preview page, MapLibre
// and pmtiles from the repo's node_modules, the PMTiles file (with Range
// requests) and a proxy for the Dataforsyningen base map, so the browser only
// talks to localhost. Not part of the app.
//
//   PMTILES=/path/soekort.pmtiles node scripts/soekort/ddm-pmtiles/preview/serve.mjs [port]
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../../..");
const PMTILES = process.env.PMTILES || path.join(process.env.HOME, "dev/soekort-ddm/work/soekort.pmtiles");
const CACHE = process.env.PROXY_CACHE || path.join(process.env.HOME, "dev/soekort-ddm/proxy-cache");
// The public token the app ships with (docs/tokens.md), read from its one home.
const TOKEN =
  process.env.NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN ||
  /DATAFORSYNINGEN_TOKEN \|\| "(\w+)"/.exec(readFileSync(path.join(REPO, "src/lib/map/styles.ts"), "utf8"))[1];
const PROXY_HOSTS = new Set(["api.dataforsyningen.dk", "cdn.dataforsyningen.dk"]);
const TYPES = { ".html": "text/html; charset=utf-8", ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".map": "application/json" };

const STATIC = {
  "/": path.join(HERE, "index.html"),
  "/style.mjs": path.join(HERE, "style.mjs"),
  "/lib/pmtiles.js": path.join(REPO, "node_modules/pmtiles/dist/pmtiles.js"),
};

function sendFile(res, file, req) {
  const size = statSync(file).size;
  const type = TYPES[path.extname(file)] || "application/octet-stream";
  const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range || "");
  if (range) {
    const start = Number(range[1]);
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1, "Accept-Ranges": "bytes" });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
  createReadStream(file).pipe(res);
}

async function proxy(res, target) {
  const u = new URL(target);
  if (!PROXY_HOSTS.has(u.hostname)) {
    res.writeHead(403).end("host not allowed");
    return;
  }
  if (u.hostname === "api.dataforsyningen.dk" && !u.searchParams.has("token")) u.searchParams.set("token", TOKEN);
  const key = createHash("sha1").update(u.href).digest("hex");
  const file = path.join(CACHE, key);
  if (existsSync(file)) {
    const meta = JSON.parse(readFileSync(file + ".json", "utf8"));
    res.writeHead(meta.status, { "Content-Type": meta.type });
    res.end(readFileSync(file));
    return;
  }
  const r = await fetch(u, { headers: { Referer: "https://kort.mahoje.dk/" } });
  const body = Buffer.from(await r.arrayBuffer());
  const type = r.headers.get("content-type") || "application/octet-stream";
  if (r.ok) {
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, body);
    writeFileSync(file + ".json", JSON.stringify({ status: r.status, type }));
  }
  res.writeHead(r.status, { "Content-Type": type });
  res.end(body);
}

const port = Number(process.argv[2] || 7300);
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/proxy") return await proxy(res, url.searchParams.get("u"));
    if (url.pathname === "/data/soekort.pmtiles") return sendFile(res, PMTILES, req);
    if (STATIC[url.pathname]) return sendFile(res, STATIC[url.pathname], req);
    if (url.pathname.startsWith("/lib/maplibre/")) {
      const file = path.join(REPO, "node_modules/maplibre-gl/dist", path.basename(url.pathname));
      if (existsSync(file)) return sendFile(res, file, req);
    }
    res.writeHead(404).end("not found");
  } catch (e) {
    res.writeHead(502).end(String(e));
  }
}).listen(port, "127.0.0.1", () => console.log(`preview on http://127.0.0.1:${port}/`));
