import { describe, it, expect } from "vitest";
import { latlngToUtm, utmToLatlng } from "../utm";
import {
  autoPrintSpacing,
  autoScreenSpacing,
  classifyGridLine,
  computeGridLines,
  dominantAxis,
  dropOverlapping,
  edgeCrossings,
  formatGridLabel,
  gridValues,
  guardSpacing,
  labelStep,
  resolvePrintSpacing,
  resolveScreenSpacing,
  resolveUtmZone,
  type EdgeSample,
} from "../utmGrid";

// Grid crossings in EPSG:25832 / 25833 → ETRS89 lat/lng, computed with PROJ
// (pyproj 3.8, EPSG:25832 → EPSG:4258).
const REFERENCES = [
  { name: "Aarhus", zone: 32, e: 575000, n: 6224000, lat: 56.155114391, lng: 10.207417539 },
  { name: "Fyn/Langeland", zone: 32, e: 592000, n: 6124000, lat: 55.253893861, lng: 10.447414739 },
  { name: "Bornholm (Rønne) i zone 32", zone: 32, e: 870000, n: 6130000, lat: 55.17772746, lng: 14.813280399 },
  { name: "Bornholm (Nexø) i zone 32", zone: 32, e: 880000, n: 6120000, lat: 55.080780024, lng: 14.95609252 },
  { name: "Bornholm i zone 33", zone: 33, e: 490000, n: 6110000, lat: 55.136568227, lng: 14.843139834 },
];

function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111320;
  const dLng = (lng2 - lng1) * 111320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

describe("grid crossings match PROJ within 5 m", () => {
  for (const r of REFERENCES) {
    it(`${r.name}: E${r.e} N${r.n}`, () => {
      const ll = utmToLatlng(r.e, r.n, r.zone);
      expect(metersBetween(ll.lat, ll.lng, r.lat, r.lng)).toBeLessThan(5);
      const u = latlngToUtm(r.lat, r.lng, r.zone);
      expect(Math.hypot(u.easting - r.e, u.northing - r.n)).toBeLessThan(5);
    });
  }

  it("computeGridLines puts the 575 km line through the PROJ crossing at Aarhus", () => {
    const lines = computeGridLines(
      { west: 10.15, east: 10.27, south: 56.12, north: 56.19 },
      32,
      1000
    );
    const e575 = lines.find((l) => l.axis === "E" && l.value === 575000)!;
    expect(e575).toBeDefined();
    // Nearest vertex-interpolated point to the reference latitude.
    const ref = REFERENCES[0];
    const pts = e575.coords;
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [lng1, lat1] = pts[i];
      const [lng2, lat2] = pts[i + 1];
      if ((lat1 - ref.lat) * (lat2 - ref.lat) <= 0) {
        const f = (ref.lat - lat1) / (lat2 - lat1);
        const lng = lng1 + f * (lng2 - lng1);
        best = metersBetween(ref.lat, lng, ref.lat, ref.lng);
      }
    }
    expect(best).toBeLessThan(5);
  });
});

describe("resolveUtmZone", () => {
  it("uses zone 32 for all of Denmark in 'dk' mode, Bornholm included", () => {
    expect(resolveUtmZone(10.2, 56.15, "dk")).toBe(32);
    expect(resolveUtmZone(14.9, 55.1, "dk")).toBe(32);
  });
  it("uses the standard zone in 'std' mode (zone 33 on Bornholm, like a GPS)", () => {
    expect(resolveUtmZone(14.9, 55.1, "std")).toBe(33);
    expect(resolveUtmZone(10.2, 56.15, "std")).toBe(32);
  });
  it("falls back to the standard zone outside Denmark", () => {
    expect(resolveUtmZone(18.1, 59.3, "dk")).toBe(34);
  });
});

describe("spacing", () => {
  it("auto print spacing is 1 km up to 1:50.000", () => {
    expect(autoPrintSpacing(10000)).toBe(1000);
    expect(autoPrintSpacing(25000)).toBe(1000);
    expect(autoPrintSpacing(50000)).toBe(1000);
    expect(autoPrintSpacing(100000)).toBe(2000);
    expect(autoPrintSpacing(250000)).toBe(10000);
  });

  it("density guard keeps 100 m at 1:25.000 (4 mm) but coarsens at 1:50.000 (2 mm)", () => {
    expect(resolvePrintSpacing(100, 25000)).toEqual({ requested: 100, spacing: 100, coarsened: false });
    expect(resolvePrintSpacing(100, 50000)).toEqual({ requested: 100, spacing: 500, coarsened: true });
    expect(resolvePrintSpacing(1000, 500000)).toEqual({ requested: 1000, spacing: 2000, coarsened: true });
  });

  it("hides the grid when even 10 km is too dense", () => {
    expect(guardSpacing(1000, 1 / 5000, 8)).toEqual({ spacing: null, coarsened: true });
  });

  it("screen: coarsens a fixed spacing when zoomed out, auto follows zoom", () => {
    // 50 m/px: 100 m = 2 px (too dense) → 500 m = 10 px
    expect(resolveScreenSpacing(100, 50)).toEqual({ requested: 100, spacing: 500, coarsened: true });
    expect(resolveScreenSpacing(1000, 5).spacing).toBe(1000);
    expect(autoScreenSpacing(1)).toBe(100);
    expect(autoScreenSpacing(10)).toBe(1000);
    expect(autoScreenSpacing(1000)).toBeNull();
  });
});

describe("classifyGridLine (hierarchy)", () => {
  it("1 km grid: every whole 10 km line is major", () => {
    expect(classifyGridLine(570000, 1000)).toBe("major");
    expect(classifyGridLine(6220000, 1000)).toBe("major");
    expect(classifyGridLine(575000, 1000)).toBe("minor");
  });
  it("100 m grid: km lines medium, 10 km major, rest minor", () => {
    expect(classifyGridLine(570000, 100)).toBe("major");
    expect(classifyGridLine(575000, 100)).toBe("medium");
    expect(classifyGridLine(575300, 100)).toBe("minor");
  });
  it("5 km grid: every other line (10 km) is major", () => {
    expect(classifyGridLine(570000, 5000)).toBe("major");
    expect(classifyGridLine(575000, 5000)).toBe("minor");
  });
  it("10 km grid: only 100 km lines stand out", () => {
    expect(classifyGridLine(600000, 10000)).toBe("major");
    expect(classifyGridLine(570000, 10000)).toBe("minor");
  });
});

describe("grid lines for an extent", () => {
  it("covers Aarhus with the expected 1 km lines and hierarchy", () => {
    const lines = computeGridLines({ west: 10.05, east: 10.27, south: 56.12, north: 56.19 }, 32, 1000);
    const e = lines.filter((l) => l.axis === "E").map((l) => l.value);
    const n = lines.filter((l) => l.axis === "N").map((l) => l.value);
    expect(e).toContain(570000);
    expect(e).toContain(575000);
    expect(n).toContain(6220000);
    expect(n).toContain(6224000);
    expect(e.every((v) => v % 1000 === 0)).toBe(true);
    expect(lines.find((l) => l.value === 570000)!.cls).toBe("major");
    expect(lines.find((l) => l.value === 575000)!.cls).toBe("minor");
    for (const l of lines) expect(l.coords.length).toBeGreaterThanOrEqual(2);
  });

  it("gridValues returns multiples within range", () => {
    expect(gridValues(574200, 577900, 1000)).toEqual([575000, 576000, 577000]);
  });

  it("refuses absurd line counts instead of freezing", () => {
    expect(computeGridLines({ west: 8, east: 13, south: 54.5, north: 57.8 }, 32, 100, 1000)).toEqual([]);
  });
});

describe("formatGridLabel", () => {
  it("short (principal digits): small leading digits, two big km digits", () => {
    expect(formatGridLabel(592000, "short")).toEqual({ prefix: "5", main: "92" });
    expect(formatGridLabel(6124000, "short")).toEqual({ prefix: "61", main: "24" });
    expect(formatGridLabel(605000, "short")).toEqual({ prefix: "6", main: "05" });
  });
  it("full: whole km", () => {
    expect(formatGridLabel(592000, "full")).toEqual({ prefix: "", main: "592" });
    expect(formatGridLabel(6124000, "full")).toEqual({ prefix: "", main: "6124" });
  });
  it("sub-km lines get a decimal comma", () => {
    expect(formatGridLabel(592300, "short")).toEqual({ prefix: "5", main: "92,3" });
    expect(formatGridLabel(592500, "full")).toEqual({ prefix: "", main: "592,5" });
  });
});

describe("label thinning", () => {
  it("labels every line when there is room, otherwise every 2nd/5th/10th", () => {
    // 1 km at 1:25.000 = 40 mm, labels need 8 mm → every line
    expect(labelStep(1000, 1000 / 25000, 8)).toBe(1000);
    // 100 m at 1:25.000 = 4 mm → every 2nd line (8 mm)
    expect(labelStep(100, 1000 / 25000, 8)).toBe(200);
    // 1 km at 1:250.000 = 4 mm with 10 mm labels → every 5th
    expect(labelStep(1000, 1000 / 250000, 10)).toBe(5000);
  });

  it("finds edge crossings by interpolation and drops overlapping labels", () => {
    // Top edge 0..100 mm spanning E 574.5–578.5 km
    const samples: EdgeSample[] = [0, 25, 50, 75, 100].map((t) => ({
      t,
      e: 574500 + t * 40,
      n: 6224000 + t * 0.5,
    }));
    expect(dominantAxis(samples)).toBe("E");
    const c = edgeCrossings(samples, "E", 1000);
    expect(c.map((x) => x.value)).toEqual([575000, 576000, 577000, 578000]);
    expect(c[0].t).toBeCloseTo(12.5, 6);
    expect(c[1].t).toBeCloseTo(37.5, 6);

    const kept = dropOverlapping([{ t: 0 }, { t: 5 }, { t: 12 }, { t: 30 }, { t: 33 }], 10);
    expect(kept.map((k) => k.t)).toEqual([0, 12, 30]);
  });

  it("left edge picks the northing axis", () => {
    const samples: EdgeSample[] = [0, 50, 100].map((t) => ({ t, e: 575000 + t, n: 6230000 - t * 40 }));
    expect(dominantAxis(samples)).toBe("N");
    expect(edgeCrossings(samples, "N", 1000).map((x) => x.value)).toEqual([6230000, 6229000, 6228000, 6227000, 6226000]);
  });
});
