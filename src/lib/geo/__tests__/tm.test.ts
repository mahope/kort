import { describe, it, expect } from "vitest";
import { forwardTm, inverseTm, WGS84, GRS80 } from "../tm";
import { latlngToUtm, utmToLatlng } from "../utm";

describe("forwardTm / inverseTm (generic transverse Mercator)", () => {
  it("reproduces latlngToUtm/utmToLatlng when given UTM zone 32's own parameters", () => {
    // Aarhus ≈ 56.1567°N, 10.2108°E — zone 32 central meridian is 9°E.
    const params = { lon0: 9, k0: 0.9996, falseEasting: 500000, falseNorthing: 0, ellipsoid: WGS84 };
    const utm = latlngToUtm(56.1567, 10.2108, 32);
    const generic = forwardTm(56.1567, 10.2108, params);
    expect(generic.easting).toBeCloseTo(utm.easting, 9);
    expect(generic.northing).toBeCloseTo(utm.northing, 9);

    const backGeneric = inverseTm(utm.easting, utm.northing, params);
    const backUtm = utmToLatlng(utm.easting, utm.northing, 32);
    expect(backGeneric.lat).toBeCloseTo(backUtm.lat, 12);
    expect(backGeneric.lng).toBeCloseTo(backUtm.lng, 12);
  });

  it("round-trips an arbitrary zone that is neither UTM nor DKTM", () => {
    const params = { lon0: 20, k0: 0.9999, falseEasting: 300000, falseNorthing: 1000000, ellipsoid: GRS80 };
    const { easting, northing } = forwardTm(60.5, 20.8, params);
    const back = inverseTm(easting, northing, params);
    expect(back.lat).toBeCloseTo(60.5, 8);
    expect(back.lng).toBeCloseTo(20.8, 8);
  });

  it("places the false easting/northing exactly on the natural origin", () => {
    const params = { lon0: 12, k0: 1, falseEasting: 0, falseNorthing: 0, ellipsoid: WGS84 };
    const { easting, northing } = forwardTm(0, 12, params);
    expect(easting).toBeCloseTo(0, 6);
    expect(northing).toBeCloseTo(0, 6);
  });
});
