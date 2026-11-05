import { describe, it, expect } from "vitest";
import { effectiveDpi, inferPaper, canvasLimitMessage, getMaxCanvasSize } from "../limits";
import { calculatePdfLayout } from "../layout";

describe("effectiveDpi", () => {
  it("keeps A4/300 untouched at 8192", () => {
    expect(effectiveDpi("A4", "portrait", 300, 8192)).toBe(300);
  });
  it("keeps A4/300 untouched at 4096 (3272 px)", () => {
    expect(effectiveDpi("A4", "portrait", 300, 4096)).toBe(300);
  });
  it("caps A2/300 at 4096 (map area 574 mm gives 6780 px)", () => {
    expect(effectiveDpi("A2", "portrait", 300, 4096)).toBe(181);
  });
  it("is orientation independent for the longest edge", () => {
    expect(effectiveDpi("A2", "landscape", 300, 4096)).toBe(181);
  });
  it("keeps A2/150 at 4096 (3390 px)", () => {
    expect(effectiveDpi("A2", "portrait", 150, 4096)).toBe(150);
  });
  it("caps A3/300 at 4096", () => {
    expect(effectiveDpi("A3", "portrait", 300, 4096)).toBe(Math.floor((300 * 4096) / 4724));
  });
  it("keeps A2/300 at 8192", () => {
    expect(effectiveDpi("A2", "portrait", 300, 8192)).toBe(300);
  });
  it("returns a DPI whose canvas fits for every format and loft", () => {
    for (const format of ["A5", "A4", "A3", "A2"] as const) {
      for (const max of [2048, 3000, 4096, 5000, 8192]) {
        const dpi = effectiveDpi(format, "portrait", 300, max);
        const l = calculatePdfLayout(format, "portrait", dpi);
        expect(Math.max(l.canvasWidth, l.canvasHeight)).toBeLessThanOrEqual(max);
      }
    }
  });
  it("returns a DPI whose canvas fits", () => {
    const dpi = effectiveDpi("A2", "portrait", 300, 4096);
    const l = calculatePdfLayout("A2", "portrait", dpi);
    expect(Math.max(l.canvasWidth, l.canvasHeight)).toBeLessThanOrEqual(4096);
  });
});

describe("inferPaper / canvasLimitMessage", () => {
  it("finds the paper behind a canvas size", () => {
    const l = calculatePdfLayout("A3", "landscape", 200);
    expect(inferPaper(l.canvasWidth, l.canvasHeight)).toEqual({ format: "A3", orientation: "landscape", dpi: 200 });
  });
  it("names format and highest dpi", () => {
    const l = calculatePdfLayout("A2", "portrait", 300);
    const msg = canvasLimitMessage(l.canvasWidth, l.canvasHeight, 4096);
    expect(msg).toContain("A2 kan højst udskrives med ca. 181 dpi");
  });
  it("falls back to pixels for unknown sizes", () => {
    expect(canvasLimitMessage(10000, 5000, 4096)).toContain("10000 x 5000 px");
  });
});

describe("getMaxCanvasSize", () => {
  it("returns a positive fallback without WebGL", () => {
    expect(getMaxCanvasSize()).toBeGreaterThan(0);
  });
});
