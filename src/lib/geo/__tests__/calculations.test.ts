import { describe, it, expect } from "vitest";
import { calculatePrintArea, groundExtentToBounds } from "../calculations";

describe("calculatePrintArea", () => {
  it("calculates A4 portrait at 1:25000", () => {
    const area = calculatePrintArea("A4", "portrait", 25000);
    // A4 = 210x297, margin 10mm each side → 190x277mm printable
    expect(area.paperWidthMm).toBe(190);
    expect(area.paperHeightMm).toBe(277);
    // Ground: 190mm * 25000 / 1000 = 4750m
    expect(area.groundWidthM).toBe(4750);
    // Ground: 277mm * 25000 / 1000 = 6925m
    expect(area.groundHeightM).toBe(6925);
  });

  it("swaps dimensions for landscape", () => {
    const area = calculatePrintArea("A4", "landscape", 25000);
    // Landscape swaps: 297x210 → 277x190mm printable
    expect(area.paperWidthMm).toBe(277);
    expect(area.paperHeightMm).toBe(190);
    expect(area.groundWidthM).toBe(6925);
    expect(area.groundHeightM).toBe(4750);
  });

  it("calculates A3 portrait at 1:50000", () => {
    const area = calculatePrintArea("A3", "portrait", 50000);
    // A3 = 297x420, margin 10mm → 277x400mm
    expect(area.paperWidthMm).toBe(277);
    expect(area.paperHeightMm).toBe(400);
    expect(area.groundWidthM).toBe(13850);
    expect(area.groundHeightM).toBe(20000);
  });

  it("handles custom margin", () => {
    const area = calculatePrintArea("A4", "portrait", 25000, 15);
    // 210 - 30 = 180, 297 - 30 = 267
    expect(area.paperWidthMm).toBe(180);
    expect(area.paperHeightMm).toBe(267);
  });
});

describe("groundExtentToBounds", () => {
  it("returns symmetric bounds around center", () => {
    const bounds = groundExtentToBounds(10.4, 56.0, 4750, 6925);

    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;

    expect(centerLat).toBeCloseTo(56.0, 4);
    expect(centerLng).toBeCloseTo(10.4, 4);
  });

  it("produces bounds with correct approximate size", () => {
    const bounds = groundExtentToBounds(10.4, 56.0, 4750, 6925);

    const latSpan = bounds.north - bounds.south;
    const lngSpan = bounds.east - bounds.west;

    // Height: 6925m / 111320 m/deg ≈ 0.0622 degrees
    expect(latSpan).toBeCloseTo(6925 / 111320, 3);

    // Width: 4750m / (111320 * cos(56°)) ≈ 0.0763 degrees
    const cosLat = Math.cos((56.0 * Math.PI) / 180);
    expect(lngSpan).toBeCloseTo(4750 / (111320 * cosLat), 3);
  });
});
