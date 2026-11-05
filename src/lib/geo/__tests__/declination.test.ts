import { describe, it, expect } from "vitest";
import {
  WMM_VALID_UNTIL,
  decimalYear,
  formatDeclination,
  isWithinWmmValidity,
  magneticDeclination,
  magneticDeclinationAtYear,
  meridianConvergence,
} from "../declination";

const DATE = new Date(Date.UTC(2026, 10, 5, 12)); // 5/11-2026

/**
 * Reference values for the three Danish points on 5/11-2026.
 * NOAA's online calculator and its web API now require a registered key, so
 * these were NOT read from the calculator. They come from an independent
 * implementation (npm geomagnetism@0.2.0, bundling NOAA's WMM2025 coefficients),
 * run 5/11-2026. The algorithm is additionally pinned to NOAA's official
 * WMM2025_TEST_VALUES.txt below. Replace with calculator values when available.
 */
const POINTS = [
  { name: "København", lat: 55.6761, lng: 12.5683, ref: 5.283 },
  { name: "Skagen", lat: 57.7226, lng: 10.5881, ref: 4.811 },
  { name: "Rønne", lat: 55.1037, lng: 14.7065, ref: 5.873 },
];

describe("magneticDeclination (WMM2025)", () => {
  for (const p of POINTS) {
    it(`${p.name} 5/11-2026 within 0.3° of reference`, () => {
      const d = magneticDeclination(p.lat, p.lng, DATE);
      expect(Math.abs(d - p.ref)).toBeLessThanOrEqual(0.3);
      expect(Math.abs(d - p.ref)).toBeLessThan(0.02); // same model, so in practice far tighter
    });
  }

  // Declination column (field 11) of NOAA's WMM2025_TEST_VALUES.txt
  // (https://www.ncei.noaa.gov/sites/default/files/2025-02/WMM2025_TEST_VALUES.txt).
  const NOAA_TEST: Array<[number, number, number, number, number]> = [
    [2025.0, 0, 80, 0, 1.28],
    [2025.0, 0, 0, 120, -0.16],
    [2025.0, 0, -80, 240, 68.78],
    [2025.0, 100, 80, 0, 0.85],
    [2025.0, 100, 0, 120, -0.15],
    [2025.0, 100, -80, 240, 68.21],
    [2027.5, 0, 80, 0, 2.59],
    [2027.5, 0, 0, 120, -0.24],
    [2027.5, 0, -80, 240, 68.49],
    [2027.5, 100, 80, 0, 2.16],
    [2027.5, 100, 0, 120, -0.23],
    [2027.5, 100, -80, 240, 67.93],
  ];
  it.each(NOAA_TEST)("matches NOAA official test value %s km %s %s", (year, h, lat, lng, decl) => {
    expect(Math.abs(magneticDeclinationAtYear(lat, lng, year, h) - decl)).toBeLessThan(0.02);
  });

  it("is expired once the coefficients pass epoch + 5 years", () => {
    // Fails on 1/1-2030 so someone has to bring in WMM2030.
    expect(decimalYear(new Date())).toBeLessThan(WMM_VALID_UNTIL);
  });

  it("rejects dates outside validity", () => {
    expect(isWithinWmmValidity(2024.9)).toBe(false);
    expect(isWithinWmmValidity(2030.0)).toBe(false);
    expect(() => magneticDeclinationAtYear(55, 12, 2031)).toThrow(RangeError);
    expect(() => magneticDeclinationAtYear(55, 12, 2020)).toThrow(RangeError);
  });
});

describe("meridianConvergence", () => {
  it("is zero on the central meridian and positive east of it", () => {
    expect(meridianConvergence(56, 9, 32)).toBeCloseTo(0, 6);
    expect(meridianConvergence(55.6761, 12.5683, 32)).toBeCloseTo(2.95, 1);
    expect(meridianConvergence(55.6761, 7, 32)).toBeLessThan(0);
  });
});

describe("formatDeclination", () => {
  it("uses Danish decimal comma and Ø/V", () => {
    expect(formatDeclination(3.94)).toBe("3,9° Ø");
    expect(formatDeclination(-1.25)).toBe("1,3° V");
  });
});
