import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  calculateArea,
  formatDistance,
  formatArea,
} from "../measure";

describe("calculateDistance", () => {
  it("returns 0 for fewer than two points", () => {
    expect(calculateDistance([])).toBe(0);
    expect(calculateDistance([[10, 56]])).toBe(0);
  });

  it("measures a one-degree meridian step at ~111 km", () => {
    // 1° of latitude ≈ 111.2 km
    const d = calculateDistance([
      [10, 56],
      [10, 57],
    ]);
    expect(d).toBeGreaterThan(111000);
    expect(d).toBeLessThan(111600);
  });

  it("sums segments along a polyline", () => {
    const twoLegs = calculateDistance([
      [10, 56],
      [10, 56.5],
      [10, 57],
    ]);
    const oneLeg = calculateDistance([
      [10, 56],
      [10, 57],
    ]);
    expect(twoLegs).toBeCloseTo(oneLeg, 0);
  });
});

describe("calculateArea", () => {
  it("returns 0 for degenerate rings", () => {
    expect(calculateArea([])).toBe(0);
    expect(
      calculateArea([
        [10, 56],
        [10.1, 56],
      ])
    ).toBe(0);
  });

  it("approximates a small square's area", () => {
    // ~0.01° square near 56°N. Width ≈ 0.01 * 111320 * cos(56) ≈ 623m,
    // height ≈ 0.01 * 111320 ≈ 1113m → ~693_000 m² (order of magnitude).
    const area = calculateArea([
      [10, 56],
      [10.01, 56],
      [10.01, 56.01],
      [10, 56.01],
    ]);
    expect(area).toBeGreaterThan(600000);
    expect(area).toBeLessThan(800000);
  });

  it("is orientation-independent (always positive)", () => {
    const ring: [number, number][] = [
      [10, 56],
      [10.01, 56],
      [10.01, 56.01],
      [10, 56.01],
    ];
    const cw = calculateArea(ring);
    const ccw = calculateArea([...ring].reverse());
    expect(cw).toBeCloseTo(ccw, 0);
    expect(cw).toBeGreaterThan(0);
  });
});

describe("formatDistance", () => {
  it("uses metres below 1 km", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("uses kilometres with Danish decimal comma at/above 1 km", () => {
    expect(formatDistance(1500)).toBe("1,5 km");
  });
});

describe("formatArea", () => {
  it("uses m² below one hectare", () => {
    expect(formatArea(500)).toBe("500 m²");
  });

  it("uses hectares between 1 ha and 1 km²", () => {
    expect(formatArea(50000)).toBe("5 ha");
  });

  it("uses km² at/above one million m²", () => {
    expect(formatArea(2000000)).toBe("2 km²");
  });
});
