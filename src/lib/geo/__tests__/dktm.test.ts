import { describe, it, expect } from "vitest";
import { latlngToDktm, dktmToLatlng, DKTM_PARAMS, type DktmZone } from "../dktm";

/**
 * Independent test vectors generated with pyproj 3.8 / PROJ
 * (EPSG:4258 ETRS89 ↔ EPSG:4093-4096 DKTM1-4), 13/11-2026.
 *
 * Each point is only paired with zones within roughly ±4° of that zone's
 * central meridian, matching each zone's intended usage area (DKTM1 Jutland
 * west of ~9°45'E, DKTM2 Jutland east of that and Funen, DKTM3 Zealand and
 * Lolland-Falster, DKTM4 Bornholm). Pairing a point with a zone far outside
 * its intended area (e.g. Esbjerg against DKTM4, ~6.5° from its central
 * meridian) pushes the truncated footpoint-latitude series used by the
 * inverse projection past the 1 cm tolerance — expected, since UTM's own
 * inverse formula (the one this code is built on) is likewise only accurate
 * within a few degrees of the central meridian.
 */
const REFERENCES: { name: string; zone: DktmZone; lat: number; lng: number; easting: number; northing: number }[] = [
  { name: "København", zone: 1, lat: 55.6761, lng: 12.5683, easting: 424437.216486, northing: 1178151.766755 },
  { name: "Skagen", zone: 1, lat: 57.7225, lng: 10.5844, easting: 294406.747601, northing: 1401351.763936 },
  { name: "Esbjerg", zone: 1, lat: 55.47, lng: 8.4518, easting: 165330.566803, northing: 1149568.050590 },

  { name: "København", zone: 2, lat: 55.6761, lng: 12.5683, easting: 561558.035943, northing: 1175368.124083 },
  { name: "Skagen", zone: 2, lat: 57.7225, lng: 10.5844, easting: 434823.220697, northing: 1400398.198789 },
  { name: "Esbjerg", zone: 2, lat: 55.47, lng: 8.4518, easting: 302091.977321, northing: 1150521.278417 },
  { name: "Rønne", zone: 2, lat: 55.101, lng: 14.706, easting: 700276.669329, northing: 1118475.300552 },

  { name: "København", zone: 3, lat: 55.6761, lng: 12.5683, easting: 651480.516987, northing: 1172680.513813 },
  { name: "Skagen", zone: 3, lat: 57.7225, lng: 10.5844, easting: 530545.779409, northing: 1400845.381940 },
  { name: "Esbjerg", zone: 3, lat: 55.47, lng: 8.4518, easting: 391454.232003, northing: 1154378.625128 },
  { name: "Rønne", zone: 3, lat: 55.101, lng: 14.706, easting: 788658.520058, northing: 1112344.807220 },

  { name: "København", zone: 4, lat: 55.6761, lng: 12.5683, easting: 647029.750228, northing: 1175181.858822 },
  { name: "Skagen", zone: 4, lat: 57.7225, lng: 10.5844, easting: 536988.033624, northing: 1408951.369501 },
  { name: "Rønne", zone: 4, lat: 55.101, lng: 14.706, easting: 781233.044323, northing: 1108513.573673 },
];

const CM = 0.01;

function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111320;
  const dLng = (lng2 - lng1) * 111320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

describe("latlngToDktm matches PROJ within 1 cm", () => {
  for (const r of REFERENCES) {
    it(`${r.name} in DKTM${r.zone}`, () => {
      const { easting, northing } = latlngToDktm(r.lat, r.lng, r.zone);
      expect(Math.abs(easting - r.easting)).toBeLessThan(CM);
      expect(Math.abs(northing - r.northing)).toBeLessThan(CM);
    });
  }
});

describe("dktmToLatlng matches PROJ within 1 cm", () => {
  for (const r of REFERENCES) {
    it(`${r.name} in DKTM${r.zone}`, () => {
      const { lat, lng } = dktmToLatlng(r.easting, r.northing, r.zone);
      expect(metersBetween(lat, lng, r.lat, r.lng)).toBeLessThan(CM);
    });
  }
});

describe("round-trip", () => {
  for (const r of REFERENCES) {
    it(`${r.name} round-trips through DKTM${r.zone} within 1 cm`, () => {
      const { easting, northing } = latlngToDktm(r.lat, r.lng, r.zone);
      const back = dktmToLatlng(easting, northing, r.zone);
      expect(metersBetween(back.lat, back.lng, r.lat, r.lng)).toBeLessThan(CM);
    });
  }
});

describe("DKTM_PARAMS matches the EPSG registry", () => {
  it("has the right EPSG code, central meridian, scale factor and false easting/northing per zone", () => {
    // Verified 13/11-2026 against epsg.io/409{3,4,5,6} (proj4 + WKT).
    expect(DKTM_PARAMS[1]).toMatchObject({ epsg: 4093, lon0: 9, k0: 0.99998, falseEasting: 200000, falseNorthing: -5000000 });
    expect(DKTM_PARAMS[2]).toMatchObject({ epsg: 4094, lon0: 10, k0: 0.99998, falseEasting: 400000, falseNorthing: -5000000 });
    expect(DKTM_PARAMS[3]).toMatchObject({ epsg: 4095, lon0: 11.75, k0: 0.99998, falseEasting: 600000, falseNorthing: -5000000 });
    // DKTM4's scale factor at natural origin is 1 — the other three zones use 0.99998.
    expect(DKTM_PARAMS[4]).toMatchObject({ epsg: 4096, lon0: 15, k0: 1, falseEasting: 800000, falseNorthing: -5000000 });
  });
});
