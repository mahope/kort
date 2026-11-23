import { describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import { drawGridLabels } from "../generator";
import { utmToLatlng } from "@/lib/geo/utm";
import type { ZonedGridLine } from "@/lib/geo/zoneGrid";

const rect = { left: 10, top: 10, right: 200, bottom: 287 };

describe("PDF grid labels", () => {
  it.each(["mgrs", "utm", "dktm2"] as const)("draws %s crossings near corners and close together", (system) => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const text = vi.spyOn(pdf, "text");
    const coords = new Map<string, { x: number; y: number }>();
    const lines = [1, 10, 12, 12, 189, -1, 191].map((offset, index): ZonedGridLine => {
      const value = 600000 + index * 1000;
      const points = [6250000, 6251000, 6252000].map((northing, vertex): [number, number] => {
        const { lng, lat } = utmToLatlng(value, northing, 32);
        const y = [rect.top, rect.bottom, rect.bottom + 1][vertex];
        coords.set(`${lng},${lat}`, { x: rect.left + offset, y });
        return [lng, lat];
      });
      return { axis: "E", value, zone: 32, cls: "major", coords: points };
    });
    const project = (lng: number, lat: number) => coords.get(`${lng},${lat}`)!;

    drawGridLabels(pdf, { toMm: project }, rect, 10, lines, { system, labelFormat: "short" });

    for (const edgeLabels of [
      text.mock.calls.filter(([, , y]) => Math.abs(y - (rect.top - 1.5)) < 0.01),
      text.mock.calls.filter(([, , y]) => y > rect.bottom),
    ]) {
      const labels = edgeLabels.map(([label]) => String(label).split(" ").at(-1));
      expect(labels.filter((label) => /^0[0-4]$/.test(label ?? ""))).toEqual(["00", "01", "02", "03", "04"]);
      expect(labels).not.toContain("05");
      expect(labels).not.toContain("06");
    }
  });

  it("labels a diagonal line once where it meets a shared corner", () => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const text = vi.spyOn(pdf, "text");
    const lines: ZonedGridLine[] = [
      { axis: "E", value: 600000, zone: 32, cls: "major", coords: [[10, 10], [20, 20]] },
      { axis: "N", value: 6251000, zone: 32, cls: "major", coords: [[10, 10], [30, 20]] },
    ];
    drawGridLabels(pdf, { toMm: (x, y) => ({ x, y }) }, rect, 10, lines, { system: "utm", labelFormat: "short" });
    expect(text.mock.calls.map(([label]) => label)).toEqual(["6", "00", "62", "51"]);
  });
});
