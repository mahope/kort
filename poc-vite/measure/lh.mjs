// Lighthouse 13.6.0, median of 3 per form factor, alternating target order per round.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import { targets, TOOLS, CHROME } from "./lib.mjs";

const out = process.argv[2];
const T = targets({ maps: false });
const rounds = 3;
const runs = [];
const metrics = (j) => ({
  perf: Math.round(j.categories.performance.score * 100),
  a11y: Math.round(j.categories.accessibility.score * 100),
  tbt: Math.round(j.audits["total-blocking-time"].numericValue),
  lcp: Math.round(j.audits["largest-contentful-paint"].numericValue),
  fcp: Math.round(j.audits["first-contentful-paint"].numericValue),
  cls: +j.audits["cumulative-layout-shift"].numericValue.toFixed(3),
  tti: j.audits["interactive"]?.numericValue != null ? Math.round(j.audits["interactive"].numericValue) : null,
});
for (let r = 0; r < rounds; r++) {
  for (const ff of ["mobile", "desktop"]) {
    const order = r % 2 === 0 ? ["next", "vite"] : ["vite", "next"];
    for (const label of order) {
      const t = T[label];
      const stop = await t.start();
      const load = os.loadavg()[0].toFixed(2);
      const args = [t.url, "--output=json", "--output-path=stdout", "--quiet", "--only-categories=performance,accessibility",
        "--chrome-flags=--headless=new --disable-dev-shm-usage"];
      if (ff === "desktop") args.push("--preset=desktop");
      try {
        const stdout = execFileSync(`${TOOLS}/.bin/lighthouse`, args, { env: { ...process.env, CHROME_PATH: CHROME }, maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "inherit"] });
        const m = { label, ff, round: r + 1, load1: load, ...metrics(JSON.parse(stdout.toString())) };
        runs.push(m); console.log(JSON.stringify(m));
      } catch (e) { console.log("FAIL", label, ff, r, String(e.message).slice(0, 300)); }
      finally { stop(); }
    }
  }
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const summary = {};
for (const label of ["next", "vite"]) for (const ff of ["mobile", "desktop"]) {
  const rs = runs.filter((x) => x.label === label && x.ff === ff);
  summary[`${label}-${ff}`] = { n: rs.length, ...Object.fromEntries(["perf", "a11y", "tbt", "lcp", "fcp", "cls", "tti"].map((k) => [k, rs.every((x) => x[k] != null) ? med(rs.map((x) => x[k])) : null])) };
}
fs.writeFileSync(out, JSON.stringify({ runs, summary, loadAtEnd: os.loadavg() }, null, 2));
console.log(JSON.stringify(summary, null, 1));
