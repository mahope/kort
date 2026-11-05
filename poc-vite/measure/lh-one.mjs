// Diagnose one mobile Lighthouse run per target: LCP element, layout shifts, main-thread.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { targets, TOOLS, CHROME } from "./lib.mjs";
const T = targets({});
const res = {};
for (const label of ["next", "vite"]) {
  const stop = await T[label].start();
  try {
    const out = execFileSync(`${TOOLS}/.bin/lighthouse`, [T[label].url, "--output=json", "--output-path=stdout", "--quiet", "--only-categories=performance", ...(process.env.LH_THROTTLE ? ["--throttling-method=" + process.env.LH_THROTTLE] : []), "--chrome-flags=--headless=new --disable-dev-shm-usage"], { env: { ...process.env, CHROME_PATH: CHROME }, maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "inherit"] });
    const j = JSON.parse(out.toString());
    const a = j.audits;
    const lcpEl = a["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node;
    const shifts = a["layout-shifts"]?.details?.items?.slice(0, 3).map((i) => ({ el: i.node?.selector ?? i.node?.snippet?.slice(0, 80), score: i.score }));
    res[label] = { lcpEl: lcpEl && { sel: lcpEl.selector, snip: lcpEl.snippet?.slice(0, 120) }, shifts, lcpPhases: a["lcp-breakdown-insight"]?.details?.items ?? null, rendering: a["render-blocking-insight"]?.score, mainThread: Math.round(a["mainthread-work-breakdown"]?.numericValue ?? 0), bootup: Math.round(a["bootup-time"]?.numericValue ?? 0), fcp: a["first-contentful-paint"].numericValue, lcp: a["largest-contentful-paint"].numericValue, interactive: a["interactive"]?.numericValue };
  } finally { stop(); }
}
fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 1).slice(0, 3500));
