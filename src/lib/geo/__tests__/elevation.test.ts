import { describe, it, expect } from "vitest";
import { extractElevationProfile, lineStringsOf } from "../elevation";

describe("extractElevationProfile", () => {
  it("returns null when fewer than two points carry elevation", () => {
    expect(extractElevationProfile([])).toBeNull();
    expect(extractElevationProfile([[10, 56, 100]])).toBeNull();
    expect(extractElevationProfile([[10, 56], [10, 57]])).toBeNull();
  });

  it("computes ascent, descent and min/max over a profile", () => {
    const profile = extractElevationProfile([
      [10, 56, 100],
      [10, 56.01, 150],
      [10, 56.02, 120],
    ]);
    expect(profile).not.toBeNull();
    expect(profile!.ascentM).toBeCloseTo(50, 5);
    expect(profile!.descentM).toBeCloseTo(30, 5);
    expect(profile!.minEle).toBe(100);
    expect(profile!.maxEle).toBe(150);
    expect(profile!.points).toHaveLength(3);
    expect(profile!.points[0].dist).toBe(0);
    // Distance increases monotonically.
    expect(profile!.points[2].dist).toBeGreaterThan(profile!.points[1].dist);
  });

  it("accumulates 2D distance (~2.2 km over two ~0.01° steps)", () => {
    const profile = extractElevationProfile([
      [10, 56, 0],
      [10, 56.01, 0],
      [10, 56.02, 0],
    ]);
    expect(profile!.distanceM).toBeGreaterThan(2100);
    expect(profile!.distanceM).toBeLessThan(2300);
  });
});

describe("lineStringsOf", () => {
  it("returns the ring for a LineString", () => {
    expect(
      lineStringsOf({ type: "LineString", coordinates: [[0, 0], [1, 1]] })
    ).toEqual([[[0, 0], [1, 1]]]);
  });

  it("returns each ring for a MultiLineString", () => {
    expect(
      lineStringsOf({
        type: "MultiLineString",
        coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]],
      })
    ).toHaveLength(2);
  });

  it("returns nothing for non-line geometries", () => {
    expect(lineStringsOf({ type: "Point", coordinates: [0, 0] })).toEqual([]);
  });
});
