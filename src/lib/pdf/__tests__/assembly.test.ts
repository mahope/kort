import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsPDF } from "jspdf";

vi.mock("maplibre-gl", () => ({ default: {}, setWorkerUrl: () => {} }));
const renderMapToImage = vi.hoisted(() => vi.fn());
vi.mock("../renderer", () => ({ renderMapToImage }));

import { usePrintStore } from "@/stores/printStore";
import { calculatePdfLayout } from "../layout";
import {
  assembledSizeCm,
  drawAssemblyMarks,
  drawCropMarks,
  overviewCells,
  overviewPlacement,
  sheetNeighbours,
} from "../assembly";
import { generatePdf } from "../generator";
import { printDpi } from "@/constants/paperFormats";

const layout = calculatePdfLayout("A4", "portrait", 150);

describe("sheet neighbours", () => {
  it("knows which sheet continues on each side of a 3 x 3 grid", () => {
    expect(sheetNeighbours({ row: 1, col: 1 }, 3, 3)).toEqual({ top: "A2", bottom: "C2", left: "B1", right: "B3" });
    expect(sheetNeighbours({ row: 0, col: 0 }, 3, 3)).toEqual({ top: null, bottom: "B1", left: null, right: "A2" });
    expect(sheetNeighbours({ row: 2, col: 2 }, 3, 3)).toEqual({ top: "B3", bottom: null, left: "C2", right: null });
  });

  it("gives the assembled size with overlaps laid on top", () => {
    // A4 map area 190 x 277 mm, 3 x 3 sheets, 10 mm overlap.
    expect(assembledSizeCm(layout, 3, 3, 10)).toEqual({ widthCm: 55, heightCm: 81.1 });
    expect(assembledSizeCm(layout, 1, 1, 10)).toEqual({ widthCm: 19, heightCm: 27.7 });
  });
});

describe("marks on a sheet", () => {
  function lines(draw: (pdf: jsPDF) => void) {
    const pdf = new jsPDF({ unit: "mm", format: [layout.pageWidthMm, layout.pageHeightMm] });
    const line = vi.spyOn(pdf, "line");
    const text = vi.spyOn(pdf, "text");
    draw(pdf);
    return { line: line.mock.calls as number[][], text: text.mock.calls.map((c) => String(c[0])) };
  }

  it("puts eight crop marks in the margin, clear of the map", () => {
    const { line } = lines((pdf) => drawCropMarks(pdf, layout));
    expect(line).toHaveLength(8);
    const x1 = layout.marginMm, y1 = layout.marginMm;
    const x2 = x1 + layout.mapWidthMm, y2 = y1 + layout.mapHeightMm;
    for (const [ax, ay, bx, by] of line) {
      for (const [x, y] of [[ax, ay], [bx, by]]) {
        const inside = x > x1 && x < x2 && y > y1 && y < y2;
        expect(inside).toBe(false);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("draws the overlap line only towards right and bottom neighbours", () => {
    const { line, text } = lines((pdf) =>
      drawAssemblyMarks(pdf, layout, { top: "A1", bottom: "C1", left: null, right: "B2" }, 10)
    );
    const right = layout.marginMm + layout.mapWidthMm - 10;
    const bottom = layout.marginMm + layout.mapHeightMm - 10;
    expect(line).toEqual([
      [right, layout.marginMm, right, layout.marginMm + layout.mapHeightMm],
      [layout.marginMm, bottom, layout.marginMm + layout.mapWidthMm, bottom],
    ]);
    expect(text.sort()).toEqual(["Fortsætter på A1", "Fortsætter på B2", "Fortsætter på C1"]);
  });

  it("draws no overlap line without overlap", () => {
    const { line } = lines((pdf) => drawAssemblyMarks(pdf, layout, { top: null, bottom: "B1", left: null, right: "A2" }, 0));
    expect(line).toHaveLength(0);
  });
});

describe("overview page", () => {
  it("fits the whole area with its aspect and tiles the sheets edge to edge", () => {
    const place = overviewPlacement(layout, 9000, 13000);
    expect(place.w / place.h).toBeCloseTo(9000 / 13000, 6);
    expect(place.x).toBeGreaterThanOrEqual(layout.marginMm);
    expect(place.x + place.w).toBeLessThanOrEqual(layout.marginMm + layout.mapWidthMm + 1e-9);
    const cells = overviewCells(place, 2, 2, 4750, 6925, 250);
    expect(cells.map((c) => c.label)).toEqual(["A1", "A2", "B1", "B2"]);
    const last = cells[3];
    expect(last.x + last.w).toBeCloseTo(place.x + place.w, 6);
    expect(last.y + last.h).toBeCloseTo(place.y + place.h, 6);
  });
});

describe("large formats", () => {
  it("caps A1 and A0 at 150 dpi and leaves the rest alone", () => {
    expect(printDpi("A0", 300)).toBe(150);
    expect(printDpi("A1", 200)).toBe(150);
    expect(printDpi("A2", 300)).toBe(300);
  });
});

// 1x1 JPEG
const JPEG = Uint8Array.from(atob(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
), (c) => c.charCodeAt(0));

describe("generatePdf floor map", () => {
  let blobs: Blob[];
  beforeEach(() => {
    blobs = [];
    renderMapToImage.mockReset();
    renderMapToImage.mockResolvedValue(JPEG);
    URL.createObjectURL = ((b: Blob) => { blobs.push(b); return "blob:test"; }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
  });

  it("adds an overview page and numbered sheets for a 3 x 3 grid", async () => {
    usePrintStore.setState({ multiPage: true, gridCols: 3, gridRows: 3, overlapMm: 10 });
    await generatePdf({
      bounds: { west: 10, east: 10.1, south: 56, north: 56.1 },
      scale: 10000, paperFormat: "A4", orientation: "portrait", dpi: 150,
    });
    const file = Buffer.from(await blobs[0].arrayBuffer()).toString("latin1");
    expect(file.match(/\/Type \/Page\b/g)).toHaveLength(10);
    expect(file).toContain("Oversigt: 9 ark");
    expect(file).toContain("Ark A1 \\(side 2 af 10\\)");
    expect(file).toContain("Ark C3 \\(side 10 af 10\\)");
    // One overview render plus one per sheet.
    expect(renderMapToImage).toHaveBeenCalledTimes(10);
    const overviewCall = renderMapToImage.mock.calls[0][0];
    expect(overviewCall.bearing).toBe(0);
  });

  it("renders A0 at 150 dpi even when 300 is chosen", async () => {
    usePrintStore.setState({ multiPage: false });
    await generatePdf({
      bounds: { west: 10, east: 10.1, south: 56, north: 56.1 },
      scale: 10000, paperFormat: "A0", orientation: "portrait", dpi: 300,
    });
    const { canvasWidth, canvasHeight } = renderMapToImage.mock.calls[0][0];
    const l = calculatePdfLayout("A0", "portrait", 150);
    expect([canvasWidth, canvasHeight]).toEqual([l.canvasWidth, l.canvasHeight]);
  });
});
