import { execFileSync } from "child_process";
import fs from "fs";
const [base] = process.argv.slice(2);
const LH = "/home/mads/dev/data/audit-2026-11-05/tools/node_modules/.bin/lighthouse";
const vals = [];
for (let i = 1; i <= 3; i++) {
  const f = `/tmp/kort-lh-${i}.json`;
  execFileSync(LH, [base + "/", "--chrome-flags=--headless=new --disable-dev-shm-usage", "--only-categories=performance", "--output=json", `--output-path=${f}`, "--quiet"], { env: { ...process.env, CHROME_PATH: "/usr/bin/google-chrome" }, stdio: "inherit" });
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  vals.push({ cls: j.audits["cumulative-layout-shift"].numericValue, perf: j.categories.performance.score });
}
console.log("LH", JSON.stringify(vals), "median CLS", vals.map((v) => v.cls).sort((a, b) => a - b)[1]);
fs.writeFileSync(new URL("../after-lighthouse.json", import.meta.url), JSON.stringify({ lighthouse: "13.6.0", runs: vals, medianCls: vals.map((v) => v.cls).sort((a, b) => a - b)[1] }, null, 2) + "\n");
