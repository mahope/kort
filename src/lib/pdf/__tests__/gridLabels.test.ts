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

  it.each(["mgrs", "utm", "dktm2"] as const)("keeps %s labels readable at closely spaced corner crossings", (system) => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const labels: { x: number; y: number; size: number; width: number }[] = [];
    const drawText = pdf.text.bind(pdf);
    vi.spyOn(pdf, "text").mockImplementation((label, x, y, options) => {
      const value = String(label);
      if (/(?:^| )(?:00|51)$/.test(value)) {
        const width = pdf.getTextWidth(value);
        labels.push({ x: options?.align === "center" ? x - width / 2 : x, y, size: pdf.getFontSize(), width });
      }
      return drawText(label, x, y, options);
    });
    const lines: ZonedGridLine[] = [
      { axis: "E", value: 600000, zone: 32, cls: "major", coords: [[10.6, 56], [10.6, 55.9]] },
      { axis: "N", value: 6251000, zone: 32, cls: "major", coords: [[10.59, 56], [10.59, 55.9]] },
    ];
    const project = (lng: number, lat: number) => lat === 56
      ? { x: lng === 10.6 ? rect.left : rect.left + 1, y: rect.top }
      : { x: lng === 10.6 ? rect.right : rect.right - 1, y: rect.bottom };
    drawGridLabels(pdf, { toMm: project }, rect, 10, lines, { system, labelFormat: "short" });

    expect(labels).toHaveLength(4);
    for (const edge of [labels.filter(({ y }) => y < rect.top), labels.filter(({ y }) => y > rect.bottom)]) {
      expect(edge).toHaveLength(2);
      expect(edge.map(({ size }) => size)).toEqual([8, 8]);
      const [first, second] = edge.sort((a, b) => a.x - b.x);
      expect(first.x).toBeGreaterThan(rect.left);
      expect(first.x + first.width).toBeLessThan(second.x);
      expect(second.x + second.width).toBeLessThan(rect.right);
    }
  });

  it.each(["top", "bottom", "left", "right"] as const)("connects crowded %s labels to their own crossings", (side) => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const text = vi.spyOn(pdf, "text");
    const leader = vi.spyOn(pdf, "line");
    const horizontal = side === "top" || side === "bottom";
    const edge = rect[side];
    const inward = side === "top" || side === "left" ? 1 : -1;
    const offsets = horizontal ? [61, 63.22, 67.21, 71.2] : [61, 62, 63, 64];
    const point = (along: number, across: number): [number, number] =>
      horizontal ? [along, across] : [across, along];
    const coords = new Map<string, { x: number; y: number }>();
    const lines = offsets.map((offset, index): ZonedGridLine => {
      const value = 598300 + index * 100;
      const points = [6250000, 6251000].map((northing, vertex): [number, number] => {
        const { lng, lat } = utmToLatlng(value, northing, 32);
        const [x, y] = point(offset, edge + inward * vertex * 10);
        coords.set(`${lng},${lat}`, { x, y });
        return [lng, lat];
      });
      return { axis: "E", value, zone: 32, cls: "minor", coords: points };
    });

    drawGridLabels(pdf, { toMm: (lng, lat) => coords.get(`${lng},${lat}`)! }, rect, 10, lines, { system: "mgrs", labelFormat: "short" });

    const labels = text.mock.calls.filter(([label]) => String(label).startsWith("NH "));
    expect(labels.map(([label]) => label)).toEqual(["NH 98,3", "NH 98,4", "NH 98,5", "NH 98,6"]);
    expect(leader).toHaveBeenCalledTimes(offsets.length);
    labels.forEach(([, x, y], index) => {
      const [x1, y1, x2, y2] = leader.mock.calls[index];
      const [crossing, frame] = point(x1, y1);
      expect(crossing).toBeCloseTo(offsets[index], 7);
      expect(frame).toBe(edge);
      const [along, across] = point(x2, y2);
      expect((across - edge) * inward).toBeLessThan(0);
      if (horizontal) {
        expect(along).toBeCloseTo(x, 7);
      } else {
        expect(along).toBeGreaterThan(y - 2);
        expect(along).toBeLessThan(y);
      }
    });
    if (horizontal) expect(labels[1][1]).toBeGreaterThan((offsets[1] + offsets[2]) / 2);
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
