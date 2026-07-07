import { describe, it, expect } from "vitest";
import { mmToPt, mmToPx, calculatePdfLayout } from "../layout";

describe("mmToPt", () => {
  it("converts millimetres to PostScript points (72 dpi)", () => {
    expect(mmToPt(25.4)).toBeCloseTo(72, 6);
    expect(mmToPt(0)).toBe(0);
  });
});

describe("mmToPx", () => {
  it("converts millimetres to pixels at a given dpi, rounded", () => {
    expect(mmToPx(25.4, 300)).toBe(300);
    expect(mmToPx(25.4, 150)).toBe(150);
    // 190mm at 300dpi = 2244.09... → 2244
    expect(mmToPx(190, 300)).toBe(2244);
  });
});

describe("calculatePdfLayout", () => {
  it("computes A4 portrait printable area with default margin", () => {
    const l = calculatePdfLayout("A4", "portrait", 300);
    expect(l.pageWidthMm).toBe(210);
    expect(l.pageHeightMm).toBe(297);
    expect(l.marginMm).toBe(10);
    expect(l.mapWidthMm).toBe(190);
    expect(l.mapHeightMm).toBe(277);
    expect(l.canvasWidth).toBe(mmToPx(190, 300));
    expect(l.canvasHeight).toBe(mmToPx(277, 300));
  });

  it("swaps page dimensions for landscape", () => {
    const l = calculatePdfLayout("A4", "landscape", 300);
    expect(l.pageWidthMm).toBe(297);
    expect(l.pageHeightMm).toBe(210);
    expect(l.mapWidthMm).toBe(277);
    expect(l.mapHeightMm).toBe(190);
  });

  it("scales canvas resolution with dpi", () => {
    const at300 = calculatePdfLayout("A4", "portrait", 300);
    const at150 = calculatePdfLayout("A4", "portrait", 150);
    expect(at300.canvasWidth).toBeGreaterThan(at150.canvasWidth);
    // Same paper geometry regardless of dpi
    expect(at300.mapWidthMm).toBe(at150.mapWidthMm);
  });

  it("defaults to 300 dpi when omitted", () => {
    const explicit = calculatePdfLayout("A3", "portrait", 300);
    const implicit = calculatePdfLayout("A3", "portrait");
    expect(implicit.canvasWidth).toBe(explicit.canvasWidth);
  });
});
