import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { decode } from "/home/user/dev/worktrees/kort-poc-40-vite/node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.mjs";

export function category(src) {
  const s = src.replace(/\\/g, "/");
  const i = s.indexOf("node_modules/"); // first level = owning package (nested deps count for their owner)
  if (i < 0) {
    if (/rolldown|\0|vite\/preload|commonjsHelpers/.test(s)) return "vite-runtime";
    if (/\[turbopack\]|turbopack:\/\/[^/]|^turbopack:\/\/\/?$/.test(s) && !/\/(src|poc-vite)\//.test(s)) return "next-runtime";
    return "app";
  }
  const rest = s.slice(i + 13);
  const pkg = rest.replace(/^(@[^/]+\/[^/]+|[^/]+).*/, "$1");
  if (pkg === "maplibre-gl") return "maplibre-gl";
  if (["src", "jspdf", "html2canvas", "dompurify", "canvg", "fflate", "core-js", "raf", "rgbcolor", "svg-pathdata", "stackblur-canvas", "fast-png", "iobuffer", "@babel/runtime", "performance-now"].includes(pkg)) return "jspdf+deps";
  if (pkg.startsWith("terra-draw")) return "terra-draw";
  if (["react", "react-dom", "scheduler"].includes(pkg)) return "react";
  if (pkg === "next" && /^next\/dist\/compiled\/(react|react-dom|scheduler)\//.test(rest)) return "react";
  if (pkg === "next" || pkg === "@swc/helpers") return "next-runtime";
  return "other-libs";
}

/** Raw chars per category for a generated file, using its sourcemap. */
export function shares(jsPath) {
  const code = fs.readFileSync(jsPath, "utf8");
  const mm = code.match(/\/\/# sourceMappingURL=(\S+)\s*$/);
  const mapPath = mm ? path.join(path.dirname(jsPath), mm[1]) : jsPath + ".map";
  const out = {};
  if (!fs.existsSync(mapPath)) { out["unmapped"] = code.length; return out; }
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const sections = map.sections ?? [{ offset: { line: 0, column: 0 }, map }];
  const lines = code.split("\n");
  const covered = new Array(lines.length).fill(0);
  let total = 0;
  for (const sec of sections) {
    const m = sec.map;
    const dec = decode(m.mappings);
    const cats = m.sources.map(category);
    dec.forEach((segs, li) => {
      const gl = li + sec.offset.line;
      const lineLen = (lines[gl] ?? "").length;
      for (let k = 0; k < segs.length; k++) {
        const seg = segs[k];
        if (seg.length < 4) continue;
        const start = seg[0] + (li === 0 ? sec.offset.column : 0);
        const end = k + 1 < segs.length ? segs[k + 1][0] + (li === 0 ? sec.offset.column : 0) : lineLen;
        const n = Math.max(0, end - start);
        out[cats[seg[1]]] = (out[cats[seg[1]]] ?? 0) + n;
        total += n;
      }
    });
  }
  out["unmapped"] = Math.max(0, code.length - total);
  return out;
}

export function strip(buf) {
  return Buffer.from(buf.toString("utf8").replace(/\n?\/\/# sourceMappingURL=.*\s*$/, ""));
}
export const gz = (b) => zlib.gzipSync(b, { level: 9 }).length;
