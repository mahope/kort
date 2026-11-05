import { describe, expect, it } from "vitest";
import { computeZonedGrid, gridIntersections } from "../zoneGrid";
import { createPaperProjector } from "@/lib/pdf/gridProjection";

const bounds = { west: 11.94, east: 12.06, south: 55.64, north: 55.76 };

describe("zone-clipped grid shared by screen and PDF", () => {
  it.each(["screen", "PDF"])("uses the exact northing at a 100 km boundary on %s", (target) => {
    const box = { west: 9.8, east: 10.2, south: 55.8, north: 56.2 };
    const lines = computeZonedGrid(box, 1000, "std", 32)
      .filter((line) => line.axis === "N" && line.value === 6200000);
    const project = target === "screen"
      ? (lng: number, lat: number) => ({ x: lng, y: lat })
      : createPaperProjector(box, { marginMm: 10, mapWidthMm: 180, mapHeightMm: 240 }, 0).toMm;
    const from = project(9.81, box.south), to = project(9.81, box.north);
    const labels = gridIntersections(lines, project, [from.x, from.y], [to.x, to.y], "mgrs", "full");
    expect(labels).toHaveLength(1);
    expect(labels[0].label).toEqual({ prefix: "32U NH ", main: "00" });
  });
  it.each(["screen", "PDF"])("uses the exact easting at a 100 km boundary on %s", (target) => {
    const box = { west: 10.4, east: 10.8, south: 55.8, north: 56.2 };
    const lines = computeZonedGrid(box, 1000, "std", 32)
      .filter((line) => line.axis === "E" && line.value === 600000);
    const project = target === "screen"
      ? (lng: number, lat: number) => ({ x: lng, y: lat })
      : createPaperProjector(box, { marginMm: 10, mapWidthMm: 180, mapHeightMm: 240 }, 0).toMm;
    const from = project(box.west, 55.9), to = project(box.east, 55.9);
    const labels = gridIntersections(lines, project, [from.x, from.y], [to.x, to.y], "mgrs", "full");
    expect(labels).toHaveLength(1);
    expect(labels[0].label).toEqual({ prefix: "32U PG ", main: "00" });
  });
  it.each([1000, 10000])("clips %i metre lines at 12 degrees", (spacing) => {
    const lines = computeZonedGrid(bounds, spacing, "std", 32);
    expect(new Set(lines.map((line) => line.zone))).toEqual(new Set([32, 33]));
    for (const line of lines) {
      for (const [lng, lat] of line.coords) {
        expect(lng).toBeGreaterThanOrEqual(bounds.west - 1e-9);
        expect(lng).toBeLessThanOrEqual(bounds.east + 1e-9);
        expect(lat).toBeGreaterThanOrEqual(bounds.south - 1e-9);
        expect(lat).toBeLessThanOrEqual(bounds.north + 1e-9);
        if (line.zone === 32) expect(lng).toBeLessThanOrEqual(12 + 1e-9);
        else expect(lng).toBeGreaterThanOrEqual(12 - 1e-9);
      }
    }
  });
  it("retains the explicit Danish zone-32 convention", () => {
    const lines = computeZonedGrid(bounds, 1000, "dk", 32);
    expect(lines.every((line) => line.zone === 32)).toBe(true);
    expect(lines.some((line) => line.coords.some(([lng]) => lng > 12))).toBe(true);
  });
  it.each([0, 37, 90])("places MGRS labels at actual PDF intersections at bearing %i", (bearing) => {
    const lines = computeZonedGrid(bounds, 1000, "std", 32);
    const proj = createPaperProjector(bounds, { marginMm: 10, mapWidthMm: 180, mapHeightMm: 240 }, bearing);
    const labels = gridIntersections(lines, proj.toMm, [10, 40], [190, 220], "mgrs", "full");
    expect(labels.length).toBeGreaterThan(2);
    expect(labels.some((label) => label.label.prefix === "32U PG ")).toBe(true);
    expect(labels.some((label) => label.label.prefix === "33U UB ")).toBe(true);
    for (const label of labels) {
      expect(label.t).toBeGreaterThanOrEqual(0);
      expect(label.t).toBeLessThanOrEqual(Math.hypot(180, 180));
      expect(label.label.main).toMatch(/^\d{2}$/);
    }
  });
  it("uses zone 33 on Bornholm", () => {
    const lines = computeZonedGrid({ west: 14.65, east: 14.8, south: 55.05, north: 55.15 }, 1000, "std", 32);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => line.zone === 33)).toBe(true);
  });
});
