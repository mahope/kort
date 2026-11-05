import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  WMM_COEFFICIENTS,
  formatDeclination,
  magneticDeclination,
  magneticDeclinationAtYear,
  meridianConvergence,
} from "../declination";
import {
  WMM_EPOCH,
  WMM_VALID_UNTIL,
  decimalYear,
  isWithinWmmValidity,
  wmmStatus,
  wmmStatusNote,
} from "../declinationValidity";

const DATE = new Date(Date.UTC(2026, 10, 5, 12)); // 5/11-2026

/**
 * Reference values for three Danish points on 5/11-2026, from an independent
 * implementation (npm geomagnetism@0.2.0, bundling NOAA's WMM2025 coefficients).
 * NOAA's online calculator was not used (it needs a registered key). The
 * algorithm and the coefficients are pinned to NOAA's own files below:
 * WMM2025_TEST_VALUES.txt and WMM.COF (data/wmm/WMM2025.COF).
 */
const POINTS = [
  { name: "København", lat: 55.6761, lng: 12.5683, ref: 5.283 },
  { name: "Skagen", lat: 57.7226, lng: 10.5881, ref: 4.811 },
  { name: "Rønne", lat: 55.1037, lng: 14.7065, ref: 5.873 },
];

describe("magneticDeclination (WMM2025)", () => {
  for (const p of POINTS) {
    it(`${p.name} 5/11-2026 within 0.02° of reference`, () => {
      expect(Math.abs(magneticDeclination(p.lat, p.lng, DATE) - p.ref)).toBeLessThan(0.02);
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

  it("embedded coefficients equal NOAA's WMM.COF", () => {
    const rows = readFileSync(join(process.cwd(), "data/wmm/WMM2025.COF"), "utf8")
      .split("\n")
      .map((l) => l.trim().split(/\s+/))
      .filter((p) => p.length === 6 && /^\d+$/.test(p[0]))
      .map((p) => p.map((v) => Number(v) + 0)); // + 0 turns "-0.0" into 0
    expect(rows).toHaveLength(90);
    expect(WMM_COEFFICIENTS.map((r) => [...r])).toEqual(rows);
  });
});

describe("model validity window", () => {
  it("covers 2025.0 up to, but not including, 2030.0", () => {
    expect(WMM_VALID_UNTIL).toBe(2030);
    expect(isWithinWmmValidity(WMM_EPOCH)).toBe(true);
    expect(isWithinWmmValidity(2029.999)).toBe(true);
    expect(isWithinWmmValidity(2024.999)).toBe(false);
    expect(isWithinWmmValidity(2030.0)).toBe(false);
  });

  it("rejects dates outside validity", () => {
    expect(() => magneticDeclinationAtYear(55, 12, 2031)).toThrow(RangeError);
    expect(() => magneticDeclinationAtYear(55, 12, 2020)).toThrow(RangeError);
    expect(() => magneticDeclination(55, 12, new Date(Date.UTC(2024, 11, 31, 23, 59)))).toThrow(RangeError);
    expect(() => magneticDeclination(55, 12, new Date(Date.UTC(2030, 0, 1)))).toThrow(RangeError);
  });

  it("accepts the first and last instants", () => {
    expect(() => magneticDeclination(55, 12, new Date(Date.UTC(2025, 0, 1)))).not.toThrow();
    expect(() => magneticDeclination(55, 12, new Date(Date.UTC(2029, 11, 31, 23, 59)))).not.toThrow();
  });

  it("converts dates to decimal years, leap years included", () => {
    expect(decimalYear(new Date(Date.UTC(2025, 0, 1)))).toBe(2025);
    expect(decimalYear(new Date(Date.UTC(2028, 6, 1, 12)))).toBeCloseTo(2028.5, 2); // 2028 is a leap year
    expect(decimalYear(new Date(Date.UTC(2030, 0, 1)))).toBe(2030);
  });

  it("reports status with a warning during the last half year", () => {
    const at = (y: number, m: number, d: number) => wmmStatus(new Date(Date.UTC(y, m - 1, d)));
    expect(at(2024, 12, 31)).toBe("not-yet");
    expect(at(2025, 1, 1)).toBe("ok");
    expect(at(2026, 11, 5)).toBe("ok");
    expect(at(2029, 6, 30)).toBe("ok");
    expect(at(2029, 7, 3)).toBe("expiring");
    // 2029.5 is 2029-07-02 12:00 UTC (182.5 days into a 365-day year).
    expect(wmmStatus(new Date(Date.UTC(2029, 6, 2, 11, 59)))).toBe("ok");
    expect(wmmStatus(new Date(Date.UTC(2029, 6, 2, 12, 0)))).toBe("expiring");
    expect(at(2029, 12, 31)).toBe("expiring");
    expect(at(2030, 1, 1)).toBe("expired");
  });

  it("explains non-ok states in Danish", () => {
    expect(wmmStatusNote("ok")).toBeNull();
    expect(wmmStatusNote("expiring")).toMatch(/udløber 2030/);
    expect(wmmStatusNote("expired")).toMatch(/vises ikke/);
    expect(wmmStatusNote("not-yet")).toMatch(/vises ikke/);
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
