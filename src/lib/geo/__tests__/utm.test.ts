import { describe, it, expect } from "vitest";
import {
  latlngToUtm,
  utmToLatlng,
  getGridInterval,
  getUtmZone,
  formatUtmCoord,
} from "../utm";

describe("latlngToUtm", () => {
  it("places Denmark (zone 32) around the expected easting/northing", () => {
    // Aarhus ≈ 56.1567°N, 10.2108°E
    const { easting, northing, zone } = latlngToUtm(56.1567, 10.2108);
    expect(zone).toBe(32);
    // Known reference (EPSG:25832) ≈ E 575_205, N 6_224_270 (±100m tolerance)
    expect(easting).toBeGreaterThan(574000);
    expect(easting).toBeLessThan(576500);
    expect(northing).toBeGreaterThan(6223000);
    expect(northing).toBeLessThan(6225500);
  });

  it("keeps the false easting of 500000 on the central meridian (9°E)", () => {
    const { easting } = latlngToUtm(56, 9, 32);
    expect(easting).toBeCloseTo(500000, 0);
  });

  it("honours a forced zone", () => {
    const { zone } = latlngToUtm(55, 15, 32);
    expect(zone).toBe(32);
  });
});

describe("utmToLatlng ↔ latlngToUtm round-trip", () => {
  const points: [number, number][] = [
    [56.1567, 10.2108], // Aarhus
    [55.6761, 12.5683], // Copenhagen
    [57.048, 9.9187], // Aalborg
    [54.9, 8.9], // south-west corner
  ];

  for (const [lat, lng] of points) {
    it(`round-trips ${lat},${lng} within ~1e-6 deg`, () => {
      const utm = latlngToUtm(lat, lng, 32);
      const back = utmToLatlng(utm.easting, utm.northing, 32);
      expect(back.lat).toBeCloseTo(lat, 6);
      expect(back.lng).toBeCloseTo(lng, 6);
    });
  }
});

describe("EPSG:25832 → WGS84 (Adressevælger address pipeline)", () => {
  it("converts an Adressevælger access point to the right WGS84 location", () => {
    // Rentemestervej 8, 2400 København NV — adgangspunkt in EPSG:25832.
    const { lat, lng } = utmToLatlng(722125.86, 6178892.29, 32);
    expect(lng).toBeCloseTo(12.5355, 3);
    expect(lat).toBeCloseTo(55.7048, 3);
  });
});

describe("getUtmZone", () => {
  it("maps Danish longitudes to zone 32", () => {
    expect(getUtmZone(9)).toBe(32);
    expect(getUtmZone(11.9)).toBe(32);
  });

  it("maps Bornholm longitudes to zone 33", () => {
    expect(getUtmZone(15)).toBe(33);
  });
});

describe("getGridInterval", () => {
  it("returns coarser grids for smaller scales", () => {
    expect(getGridInterval(25000)).toBe(1000);
    expect(getGridInterval(50000)).toBe(5000);
    expect(getGridInterval(100000)).toBe(10000);
    expect(getGridInterval(500000)).toBe(50000);
  });

  it("is monotonically non-decreasing as scale grows", () => {
    const scales = [10000, 25000, 50000, 100000, 250000, 500000];
    const intervals = scales.map(getGridInterval);
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
  });
});

describe("formatUtmCoord", () => {
  it("truncates to whole kilometres", () => {
    expect(formatUtmCoord(575205)).toBe("575");
    expect(formatUtmCoord(6224999)).toBe("6224");
  });
});
