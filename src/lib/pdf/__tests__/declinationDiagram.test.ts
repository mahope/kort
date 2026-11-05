import { describe, it, expect } from "vitest";
import { jsPDF } from "jspdf";
import { calculatePdfLayout } from "../layout";
import { PAPER_FORMATS } from "@/constants/paperFormats";
import type { Orientation, PaperFormat } from "@/types/print";
import { computeDeclinationInfo, declinationBoxRect, drawDeclinationDiagram } from "../declinationDiagram";

const overlaps = (a: { left: number; top: number; right: number; bottom: number }, b: typeof a) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

describe("declination diagram placement", () => {
  const formats = Object.keys(PAPER_FORMATS) as PaperFormat[];
  for (const f of formats) {
    for (const o of ["portrait", "landscape"] as Orientation[]) {
      it(`${f} ${o}: inside the map, clear of scale bar, north arrow and the attribution margin`, () => {
        const l = calculatePdfLayout(f, o, 150);
        const box = declinationBoxRect(l);
        const map = { left: l.marginMm, top: l.marginMm, right: l.marginMm + l.mapWidthMm, bottom: l.marginMm + l.mapHeightMm };
        expect(box.left).toBeGreaterThanOrEqual(map.left);
        expect(box.right).toBeLessThanOrEqual(map.right);
        expect(box.top).toBeGreaterThanOrEqual(map.top);
        expect(box.bottom).toBeLessThanOrEqual(map.bottom);
        // Scale bar: at most 40 mm wide from x = margin + 5, y within 12 mm of the bottom edge (generator.ts drawScaleBar).
        const scaleBar = { left: map.left + 5, right: map.left + 5 + 40, top: map.bottom - 12, bottom: map.bottom - 3 };
        expect(overlaps(box, scaleBar)).toBe(false);
        // North arrow: top-right, 8 mm in, 12 mm down, with label; generous 14 mm square.
        const north = { left: map.right - 16, right: map.right, top: map.top, bottom: map.top + 22 };
        expect(overlaps(box, north)).toBe(false);
      });
    }
  }

  it("draws without throwing, with and without grid north, and with a rotated map", () => {
    const l = calculatePdfLayout("A4", "portrait", 150);
    for (const zone of [null, 32]) {
      for (const bearing of [0, 37]) {
        const pdf = new jsPDF({ unit: "mm", format: [l.pageWidthMm, l.pageHeightMm] });
        const info = computeDeclinationInfo(55.68, 12.57, zone, new Date(Date.UTC(2026, 10, 5)));
        expect(info).not.toBeNull();
        expect(info?.convergence === null).toBe(zone === null);
        drawDeclinationDiagram(pdf, l, info!, bearing);
      }
    }
  });

  it("returns null outside the model's validity", () => {
    expect(computeDeclinationInfo(55, 12, null, new Date(Date.UTC(2035, 0, 1)))).toBeNull();
  });
});
