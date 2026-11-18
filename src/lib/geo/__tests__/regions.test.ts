import { describe, it, expect } from "vitest";
import {
  boundsTouchSweden,
  countryAt,
  distanceToCountryKm,
  isInCountry,
  mapRegionAt,
  mapRegionForBounds,
  nordicSourcesInBounds,
} from "../regions";

/** A small print frame (about 6 x 9 km) around a point. */
function around(lng: number, lat: number, dLng = 0.06, dLat = 0.04) {
  return { west: lng - dLng, east: lng + dLng, south: lat - dLat, north: lat + dLat };
}

describe("countryAt", () => {
  it.each([
    ["København", 12.57, 55.68, "dk"],
    ["Rønne, Bornholm", 14.7, 55.1, "dk"],
    ["Skagen", 10.59, 57.72, "dk"],
    ["Galdhøpiggen, Jotunheimen", 8.31, 61.64, "no"],
    ["Hardangervidda", 7.5, 60.1, "no"],
    ["Tromsø", 18.96, 69.65, "no"],
    ["Kebnekaise", 18.54, 67.9, "se"],
    ["Åmål, Dalsland", 12.7, 59.05, "se"],
    ["Malmö", 13.0, 55.6, "se"],
    ["Stockholm", 18.07, 59.33, "se"],
  ] as const)("%s is %s", (_name, lng, lat, expected) => {
    expect(countryAt(lng, lat)).toBe(expected);
  });

  it("picks the nearest country at sea", () => {
    expect(countryAt(11.2, 56.8)).toBe("dk"); // Kattegat, nearer Jutland and Anholt than Halland
    expect(countryAt(7.2, 57.85)).toBe("no"); // Skagerrak just off Lindesnes
    expect(countryAt(11.8, 57.6)).toBe("se"); // off Göteborg's archipelago
  });

  it("treats northern Germany as Danish (nearest), so the old behaviour stays", () => {
    expect(countryAt(10.0, 54.2)).toBe("dk");
  });
});

describe("mapRegionAt", () => {
  it("keeps Denmark on the Danish sources and sends Norway and Sweden to the Nordic ones", () => {
    expect(mapRegionAt(10.4, 56.0)).toBe("dk");
    expect(mapRegionAt(8.31, 61.64)).toBe("nordic");
    expect(mapRegionAt(18.54, 67.9)).toBe("nordic");
  });

  it("uses the centre of the bounds", () => {
    expect(mapRegionForBounds(around(8.31, 61.64))).toBe("nordic");
    expect(mapRegionForBounds(around(12.57, 55.68))).toBe("dk");
  });
});

describe("isInCountry and distanceToCountryKm", () => {
  it("is 0 km inside and grows with distance", () => {
    expect(isInCountry(8.31, 61.64, "no")).toBe(true);
    expect(distanceToCountryKm(8.31, 61.64, "no")).toBe(0);
    // Stockholm is far from Norway, Svinesund right at the border.
    expect(distanceToCountryKm(18.07, 59.33, "no")).toBeGreaterThan(300);
    expect(distanceToCountryKm(11.3, 59.1, "no")).toBeLessThan(10);
  });
});

describe("nordicSourcesInBounds", () => {
  it("credits only Kartverket for a print inside Norway", () => {
    expect(nordicSourcesInBounds(around(8.31, 61.64))).toEqual({ kartverket: true, openTopoMap: false });
  });

  it("credits only OpenTopoMap for a print in central Sweden", () => {
    expect(nordicSourcesInBounds(around(12.7, 59.05))).toEqual({ kartverket: false, openTopoMap: true });
  });

  it("credits both across the border at Svinesund", () => {
    expect(nordicSourcesInBounds(around(11.3, 59.1, 0.2, 0.1))).toEqual({ kartverket: true, openTopoMap: true });
  });
});

describe("boundsTouchSweden", () => {
  it("is true over Swedish land and false in Norway and Denmark", () => {
    expect(boundsTouchSweden(around(18.54, 67.9))).toBe(true);
    expect(boundsTouchSweden(around(8.31, 61.64))).toBe(false);
    expect(boundsTouchSweden(around(10.4, 56.0))).toBe(false);
  });
});
