// PoC-only static server with HTTP Range support, plus a same-origin reverse proxy to the
// Next.js server so the unchanged CSP (connect-src 'self' https:) is satisfied.
//   node serve.mjs <dataDir> <port> [nextPort]
// /tiles/<file> -> dataDir/<file> (Range, ETag, Cache-Control, Accept-Ranges); everything else -> next.
import http from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, basename } from "node:path";

const [dataDir, port, nextPort] = [process.argv[2], Number(process.argv[3] ?? 8099), Number(process.argv[4] ?? 3000)];
const log = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/__log") {
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify(log.splice(0)));
  }
  if (url.pathname.startsWith("/tiles/")) {
    const file = join(dataDir, basename(url.pathname));
    let st;
    try { st = statSync(file); } catch { res.statusCode = 404; return res.end(); }
    const etag = `"${st.size}-${Math.floor(st.mtimeMs)}"`;
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", "application/octet-stream");
    if (req.headers["if-none-match"] === etag) { res.statusCode = 304; return res.end(); }
    let start = 0, end = st.size - 1, code = 200;
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (m) {
      if (m[1] === "") { start = Math.max(0, st.size - Number(m[2])); }
      else { start = Number(m[1]); if (m[2] !== "") end = Math.min(end, Number(m[2])); }
      code = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${st.size}`);
    }
    res.statusCode = code;
    res.setHeader("Content-Length", end - start + 1);
    log.push({ t: Date.now(), range: req.headers.range ?? null, code, bytes: end - start + 1 });
    return createReadStream(file, { start, end }).pipe(res);
  }
  const p = http.request({ host: "127.0.0.1", port: nextPort, path: req.url, method: req.method, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  p.on("error", () => { res.statusCode = 502; res.end(); });
  req.pipe(p);
});
server.listen(port, "127.0.0.1", () => console.log(`listening ${port}`));
