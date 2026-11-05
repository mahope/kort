import { describe, it, expect } from "vitest";
import nextConfig, { csp, securityHeaders } from "../../next.config";

const directive = (name: string) =>
  csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `))
    ?.split(/\s+/)
    .slice(1) ?? [];

describe("security headers (next.config.ts)", () => {
  it.each(["connect-src", "img-src", "font-src"])(
    "%s does not allow every https: origin",
    (name) => {
      const sources = directive(name);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources).not.toContain("https:");
      expect(sources).not.toContain("*");
    }
  );

  it("only lists explicit https origins besides self/data/blob", () => {
    for (const name of ["connect-src", "img-src", "font-src"]) {
      for (const s of directive(name)) {
        if (["'self'", "data:", "blob:"].includes(s)) continue;
        expect(s).toMatch(/^https:\/\/[a-z0-9.-]+$/);
      }
    }
  });

  it("allows the origins the app actually uses", () => {
    expect(directive("connect-src")).toEqual(
      expect.arrayContaining([
        "https://api.dataforsyningen.dk",
        "https://cdn.dataforsyningen.dk",
        "https://adressevaelger.dk",
        "https://tile.openstreetmap.org",
        "https://analytics.holstjensen.eu",
      ])
    );
  });

  it("does not allow unsafe-eval", () => {
    expect(directive("script-src")).not.toContain("'unsafe-eval'");
  });

  it("does not send X-Powered-By and sets COOP", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const sent = (await nextConfig.headers!()).flatMap((r) => r.headers);
    expect(sent.map((h) => h.key.toLowerCase())).not.toContain("x-powered-by");
    expect(sent).toContainEqual({
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin",
    });
    expect(securityHeaders.length).toBe(sent.length);
  });
});
