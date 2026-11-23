// Static server for the render rig: / -> page.html, /nm/* -> repo node_modules,
// /tiles/* -> a data directory (Range requests, like nginx on tiles.mahoje.dk).
import { createServer } from "node:http";
import { createReadStream, statSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

export function serve({ nodeModules, tilesDir, port = 0 }) {
  const page = readFileSync(new URL("./page.html", import.meta.url));
  const types = { ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css" };
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/") { res.writeHead(200, { "content-type": "text/html" }); return res.end(page); }
    const [root, rest] = url.pathname.startsWith("/nm/") ? [nodeModules, url.pathname.slice(4)]
      : url.pathname.startsWith("/tiles/") ? [tilesDir, url.pathname.slice(7)] : [null, null];
    if (!root) { res.writeHead(404); return res.end(); }
    const file = join(root, normalize(rest).replace(/^(\.\.[/\\])+/, ""));
    let st; try { st = statSync(file); } catch { res.writeHead(404); return res.end(); }
    const type = types[file.slice(file.lastIndexOf("."))] || "application/octet-stream";
    const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || "");
    if (m) {
      const start = Number(m[1]), end = m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${st.size}`,
        "content-length": end - start + 1, "accept-ranges": "bytes" });
      return createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { "content-type": type, "content-length": st.size, "accept-ranges": "bytes" });
    createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(port, "127.0.0.1", () => r(server)));
}
