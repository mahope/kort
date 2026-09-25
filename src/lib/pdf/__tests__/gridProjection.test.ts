import { describe, it, expect } from "vitest";
import { createPaperProjector, mercY, invMercY } from "../gridProjection";
import { calculatePdfLayout } from "../layout";
import { calculatePrintArea, groundExtentToBounds } from "@/lib/geo/calculations";
import { utmToLatlng } from "@/lib/geo/utm";

describe("createPaperProjector", () => {
  const layout = calculatePdfLayout("A4", "portrait", 150);
  const area = calculatePrintArea("A4", "portrait", 25000);
  const bounds = groundExtentToBounds(10.2, 56.15, area.groundWidthM, area.groundHeightM);

  it("maps the frame corners onto the map rectangle (bearing 0)", () => {
    const p = createPaperProjector(bounds, layout, 0);
    const nw = p.toMm(bounds.west, bounds.north);
    const se = p.toMm(bounds.east, bounds.south);
    expect(nw.x).toBeCloseTo(layout.marginMm, 1);
    expect(nw.y).toBeCloseTo(layout.marginMm, 1);
    expect(se.x).toBeCloseTo(layout.marginMm + layout.mapWidthMm, 1);
    expect(se.y).toBeCloseTo(layout.marginMm + layout.mapHeightMm, 1);
  });

  it("round-trips mm ↔ lng/lat, also with a bearing", () => {
    for (const bearing of [0, 30, -90]) {
      const p = createPaperProjector(bounds, layout, bearing);
      const mm = p.toMm(10.21, 56.16);
      const back = p.fromMm(mm.x, mm.y);
      expect(back.lng).toBeCloseTo(10.21, 9);
      expect(back.lat).toBeCloseTo(56.16, 9);
    }
  });

  it("draws a 1 km grid at 1:25.000 as 4 cm on paper", () => {
    const p = createPaperProjector(bounds, layout, 0);
    const a = utmToLatlng(575000, 6224000, 32);
    const b = utmToLatlng(576000, 6224000, 32);
    const pa = p.toMm(a.lng, a.lat);
    const pb = p.toMm(b.lng, b.lat);
    // Web Mercator scale at the frame centre is used for the whole sheet, so
    // allow ±1 % (0.4 mm) for the local scale variation.
    expect(Math.hypot(pb.x - pa.x, pb.y - pa.y)).toBeGreaterThan(39.6);
    expect(Math.hypot(pb.x - pa.x, pb.y - pa.y)).toBeLessThan(40.4);
  });

  it("rotates with the bearing like MapLibre (bearing 90 puts north to the left)", () => {
    const p = createPaperProjector(bounds, layout, 90);
    const c = p.toMm(10.2, 56.15);
    const north = p.toMm(10.2, 56.16);
    expect(north.x).toBeLessThan(c.x - 1);
    expect(Math.abs(north.y - c.y)).toBeLessThan(0.01);
  });

  it("mercY/invMercY are inverse", () => {
    expect(invMercY(mercY(56.15))).toBeCloseTo(56.15, 10);
  });
});
