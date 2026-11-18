import { describe, expect, it } from "vitest";
import { formatMgrs, mgrsSquare, pointCoordinates, isGridSystem, isDktmSystem, dktmZoneOf } from "../coordinates";
import { getUtmZone } from "../utm";
import { resolveUtmZone } from "../utmGrid";

// GeographicLib GeoConvert, WGS84, standard zone, precision 0 (1 metre).
// https://geographiclib.sourceforge.io/cgi-bin/GeoConvert
const references = [
  { name: "Rådhuspladsen", lat: 55.6761, lng: 12.5683, mgrs: "33U UB 47090 72711", coarse: "33U UB 4709 7271" },
  { name: "Rønne, Bornholm", lat: 55.101, lng: 14.706, mgrs: "33U VB 81240 06070", coarse: "33U VB 8124 0607" },
];

describe("WGS84 point coordinates", () => {
  it.each(references)("matches GeographicLib at $name", ({ lat, lng, mgrs, coarse }) => {
    expect(formatMgrs(lat, lng)).toBe(mgrs);
    expect(formatMgrs(lat, lng, 4)).toBe(coarse);
    expect(mgrsSquare(lat, lng)).toBe(mgrs.split(" ").slice(0, 2).join(" "));
    expect(pointCoordinates(lat, lng)[2].value).toMatch(/^33N /);
  });
  it("selects standard zones on either side of 12 degrees", () => {
    expect(getUtmZone(11.999999, 55.7)).toBe(32);
    expect(getUtmZone(12, 55.7)).toBe(33);
    expect(formatMgrs(55.7, 11.999999)).toMatch(/^32U/);
    expect(formatMgrs(55.7, 12)).toMatch(/^33U/);
    expect(resolveUtmZone(14.706, 55.101, "dk")).toBe(32);
    expect(resolveUtmZone(14.706, 55.101, "std")).toBe(33);
  });
  it("handles Norway and the eastern antimeridian", () => {
    expect(getUtmZone(4, 58)).toBe(32);
    expect(getUtmZone(180, 0)).toBe(60);
  });
});

describe("DKTM in pointCoordinates", () => {
  it("omits the DKTM row when no system or a non-DKTM system is given", () => {
    expect(pointCoordinates(55.6761, 12.5683)).toHaveLength(4);
    expect(pointCoordinates(55.6761, 12.5683, "utm")).toHaveLength(4);
    expect(pointCoordinates(55.6761, 12.5683, "mgrs")).toHaveLength(4);
  });

  it("adds a DKTM row named after the active zone, leaving the other rows untouched", () => {
    const base = pointCoordinates(55.6761, 12.5683);
    const withDktm = pointCoordinates(55.6761, 12.5683, "dktm3");
    expect(withDktm).toHaveLength(5);
    expect(withDktm.slice(0, 4)).toEqual(base);
    expect(withDktm[4].name).toBe("DKTM3 · ETRS89");
    // easting/northing as whole metres, space-separated.
    expect(withDktm[4].value).toMatch(/^\d+ \d+$/);
  });
});

describe("isGridSystem / isDktmSystem / dktmZoneOf", () => {
  it("accepts utm, mgrs and dktm1..dktm4, rejects anything else", () => {
    for (const v of ["utm", "mgrs", "dktm1", "dktm2", "dktm3", "dktm4"]) expect(isGridSystem(v)).toBe(true);
    for (const v of ["dktm0", "dktm5", "utm32", "", "UTM"]) expect(isGridSystem(v)).toBe(false);
  });
  it("isDktmSystem is true only for dktm1..dktm4", () => {
    expect(isDktmSystem("utm")).toBe(false);
    expect(isDktmSystem("mgrs")).toBe(false);
    expect(isDktmSystem("dktm4")).toBe(true);
  });
  it("dktmZoneOf reads the zone number from the system id", () => {
    expect(dktmZoneOf("dktm1")).toBe(1);
    expect(dktmZoneOf("dktm4")).toBe(4);
  });
});
