import { describe, it, expect } from "vitest";
import { resolveBrandId, getBrand } from "./brand";

describe("resolveBrandId", () => {
  it("returns solaris for 'solaris'", () => {
    expect(resolveBrandId("solaris")).toBe("solaris");
  });
  it("defaults to mahoje for undefined", () => {
    expect(resolveBrandId(undefined)).toBe("mahoje");
  });
  it("defaults to mahoje for unknown values", () => {
    expect(resolveBrandId("bogus")).toBe("mahoje");
  });
});

describe("getBrand", () => {
  it("returns the mahoje brand set", () => {
    const b = getBrand("mahoje");
    expect(b.domain).toBe("kort.mahoje.dk");
    expect(b.baseUrl).toBe("https://kort.mahoje.dk");
    expect(b.credit.url).toBe("https://mahoje.dk");
  });
  it("returns the solaris brand set", () => {
    const b = getBrand("solaris");
    expect(b.domain).toBe("kort.solaris.dk");
    expect(b.baseUrl).toBe("https://kort.solaris.dk");
    expect(b.siteName).toBe("Kort.solaris.dk");
    expect(b.credit.label).toBe("Bygget af mahoje.dk");
    expect(b.credit.url).toBe("https://mahoje.dk");
    expect(b.github).toBe("https://github.com/mahope/kort");
  });
  it("has no residual mahoje domain in solaris output", () => {
    const b = getBrand("solaris");
    const blob = JSON.stringify({
      siteName: b.siteName,
      domain: b.domain,
      baseUrl: b.baseUrl,
      og: b.og,
      credit: { short: b.credit.short },
      analyticsDomain: b.analyticsDomain,
    });
    expect(blob).not.toContain("mahoje.dk"); // credit.url intentionally excluded
  });
});
