import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..", "..");

// The only files allowed to contain a token literal (public by design, see docs/tokens.md).
const ALLOWED = new Set(["lib/map/styles.ts", "lib/api/address.ts"]);

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "long hex string", re: /["'`][0-9a-f]{32,}["'`]/i },
  { name: "JWT-like string", re: /["'`]eyJ[A-Za-z0-9_-]{20,}/ },
  { name: "Bearer/Basic credential literal", re: /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/ },
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
    // Tests never reach the client bundle; skipping them keeps hash fixtures from tripping the guard.
    if (statSync(p).isDirectory()) return name === "__tests__" ? [] : files(p);
    return /\.(tsx?|jsx?|mjs|json)$/.test(name) ? [p] : [];
  });
}

describe("public tokens", () => {
  it("keeps token-like literals out of everything but the allowlisted files", () => {
    const offenders: string[] = [];
    for (const file of files(SRC)) {
      const rel = relative(SRC, file).split(sep).join("/");
      if (ALLOWED.has(rel)) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const { name, re } of PATTERNS) {
          if (re.test(line)) offenders.push(`${rel}:${i + 1} (${name})`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("every pattern can fail on a positive sample (and ignores a template placeholder)", () => {
    const samples: Record<string, string> = {
      "long hex string": `const x = "${"a1".repeat(16)}";`,
      "JWT-like string": `const auth = "eyJ${"A".repeat(30)}";`,
      "Bearer/Basic credential literal": `headers: { Authorization: "Bearer ${"Ab1".repeat(8)}" }`,
      "token= with literal value": `fetch("/x?token=${"Ab1".repeat(4)}")`,
      "token/key/secret assigned a string literal": `const apiKey = "${"Ab1".repeat(6)}";`,
      "|| fallback literal on NEXT_PUBLIC_*": `process.env.NEXT_PUBLIC_FOO_TOKEN || "x"`,
    };
    for (const { name, re } of PATTERNS) {
      expect(samples[name], `missing sample for ${name}`).toBeDefined();
      expect(re.test(samples[name]), name).toBe(true);
    }
    expect(PATTERNS.some(({ re }) => re.test("fetch(`/x?token=${t}`)"))).toBe(false);
  });

  it("allowlisted files exist", () => {
    for (const f of ALLOWED) expect(() => statSync(join(SRC, f))).not.toThrow();
  });
});
