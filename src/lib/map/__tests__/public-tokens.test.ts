import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..", "..");

// The only files allowed to contain a token literal (public by design, see docs/tokens.md).
const ALLOWED = new Set(["lib/map/styles.ts", "lib/api/address.ts"]);

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "long hex string", re: /["'`][0-9a-f]{32,}["'`]/i },
  { name: "token= with literal value", re: /[?&]token=(?!\$\{)[A-Za-z0-9_-]{8,}/ },
  {
    name: "token/key/secret assigned a string literal",
    re: /\b\w*(token|secret|api[_-]?key|password)\w*\s*[:=]\s*["'`][A-Za-z0-9_\-./+=]{12,}["'`]/i,
  },
  { name: "|| fallback literal on NEXT_PUBLIC_*", re: /NEXT_PUBLIC_\w*(TOKEN|KEY|SECRET)\w*\s*\|\|\s*["'`]/ },
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|jsx?|mjs|json)$/.test(name) ? [p] : [];
  });
}

describe("public tokens", () => {
  it("keeps token-like literals out of everything but the allowlisted files", () => {
    const offenders: string[] = [];
    for (const file of files(SRC)) {
      const rel = relative(SRC, file).split(sep).join("/");
      if (ALLOWED.has(rel) || rel.endsWith("public-tokens.test.ts")) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const { name, re } of PATTERNS) {
          if (re.test(line)) offenders.push(`${rel}:${i + 1} (${name})`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("detects a token literal (the scanner can fail)", () => {
    const sample = `const x = "${"a1".repeat(16)}";`;
    expect(PATTERNS.some(({ re }) => re.test(sample))).toBe(true);
    expect(PATTERNS.some(({ re }) => re.test("fetch(`/x?token=${t}`)"))).toBe(false);
  });

  it("allowlisted files exist", () => {
    for (const f of ALLOWED) expect(() => statSync(join(SRC, f))).not.toThrow();
  });
});
