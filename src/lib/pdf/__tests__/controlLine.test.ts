import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsPDF } from "jspdf";

vi.mock("maplibre-gl", () => ({ default: {}, setWorkerUrl: () => {} }));
const renderMapToImage = vi.hoisted(() => vi.fn());
vi.mock("../renderer", () => ({ renderMapToImage }));

import { PAPER_FORMATS } from "@/constants/paperFormats";
import type { Orientation, PaperFormat } from "@/types/print";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { declinationBoxRect } from "../declinationDiagram";
import { calculatePdfLayout } from "../layout";
import {
  CONTROL_LINE_MM,
  CONTROL_LINE_TEXT,
  applyPrintPreferences,
  controlLineGeometry,
  drawControlLine,
} from "../controlLine";
import { drawAttribution, drawNorthArrow, drawScaleBar, generatePdf } from "../generator";

interface Box { x1: number; y1: number; x2: number; y2: number }

/** Bounding box of everything `draw` puts on the page, read from the jsPDF calls. */
function recordBox(pdf: jsPDF, draw: () => void): Box {
  const box: Box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  const add = (x: number, y: number) => {
    box.x1 = Math.min(box.x1, x); box.x2 = Math.max(box.x2, x);
    box.y1 = Math.min(box.y1, y); box.y2 = Math.max(box.y2, y);
  };
  const p = pdf as unknown as Record<string, (...a: unknown[]) => unknown>;
  const orig = { line: p.line, triangle: p.triangle, rect: p.rect, text: p.text };
  p.line = function (...a) { add(a[0] as number, a[1] as number); add(a[2] as number, a[3] as number); return orig.line.apply(this, a); };
  p.triangle = function (...a) { for (let i = 0; i < 6; i += 2) add(a[i] as number, a[i + 1] as number); return orig.triangle.apply(this, a); };
  p.rect = function (...a) { add(a[0] as number, a[1] as number); add((a[0] as number) + (a[2] as number), (a[1] as number) + (a[3] as number)); return orig.rect.apply(this, a); };
  p.text = function (...a) {
    const str = a[0] as string;
    const w = pdf.getTextWidth(str);
    const h = pdf.getFontSize() * (25.4 / 72);
    const align = (a[3] as { align?: string } | undefined)?.align;
    const x = a[1] as number;
    const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    add(x0, (a[2] as number) - h); add(x0 + w, a[2] as number);
    return orig.text.apply(this, a);
  };
  try { draw(); } finally { Object.assign(p, orig); }
  return box;
}

const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

const FORMATS = Object.keys(PAPER_FORMATS) as PaperFormat[];
const ORIENTATIONS: Orientation[] = ["portrait", "landscape"];
const SCALES = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

function newPdf(format: PaperFormat, orientation: Orientation) {
  const layout = calculatePdfLayout(format, orientation, 150);
  const pdf = new jsPDF({ orientation, unit: "mm", format: [layout.pageWidthMm, layout.pageHeightMm] });
  return { pdf, layout };
}

describe("control line", () => {
  for (const format of FORMATS) {
    for (const orientation of ORIENTATIONS) {
      it(`keeps the 100 mm control line and boxed scale bar clear of nearby elements (${format} ${orientation})`, () => {
        const { pdf, layout } = newPdf(format, orientation);
        const lines: number[][] = [];
        const origLine = pdf.line.bind(pdf);
        pdf.line = ((...a: number[]) => { lines.push(a); return origLine(...(a as [number, number, number, number])); }) as unknown as typeof pdf.line;
        const control = recordBox(pdf, () => drawControlLine(pdf, layout));

        const horizontal = lines.filter(([x1, y1, , y2]) => y1 === y2 && Number.isFinite(x1));
        expect(horizontal).toHaveLength(1);
        const [x1, , x2] = horizontal[0];
        expect(Math.abs(x2 - x1 - CONTROL_LINE_MM)).toBeLessThanOrEqual(0.01);

        const map: Box = { x1: layout.marginMm, y1: layout.marginMm, x2: layout.marginMm + layout.mapWidthMm, y2: layout.marginMm + layout.mapHeightMm };
        expect(control.x1).toBeGreaterThanOrEqual(map.x1);
        expect(control.x2).toBeLessThanOrEqual(map.x2);
        expect(control.y1).toBeGreaterThanOrEqual(map.y1);
        expect(control.y2).toBeLessThanOrEqual(map.y2);

        const arrow = recordBox(pdf, () => drawNorthArrow(pdf, layout, 0));
        const arrowRotated = recordBox(pdf, () => drawNorthArrow(pdf, layout, 45));
        const attribution = recordBox(pdf, () => drawAttribution(pdf, layout, 25000, { system: "utm", square: "", zone: 32, spacing: 1000 }));
        expect(overlaps(control, arrow)).toBe(false);
        expect(overlaps(control, arrowRotated)).toBe(false);
        expect(overlaps(control, attribution)).toBe(false);
        for (const scale of SCALES) {
          const contentPdf = newPdf(format, orientation).pdf;
          const rect = vi.spyOn(contentPdf, "rect");
          const fillColor = vi.spyOn(contentPdf, "setFillColor");
          const line = vi.spyOn(contentPdf, "line");
          const label = vi.spyOn(contentPdf, "text");
          const bar = recordBox(contentPdf, () => drawScaleBar(contentPdf, layout, scale));
          expect(rect).toHaveBeenCalledExactlyOnceWith(bar.x1, bar.y1, expect.any(Number), expect.any(Number), "FD");
          expect(fillColor).toHaveBeenCalledWith(255, 255, 255);
          for (const order of [...line.mock.invocationCallOrder, ...label.mock.invocationCallOrder]) {
            expect(rect.mock.invocationCallOrder[0]).toBeLessThan(order);
          }

          const { left, top, right, bottom } = declinationBoxRect(layout);
          for (const other of [control, arrow, arrowRotated, { x1: left, y1: top, x2: right, y2: bottom }]) {
            expect(overlaps(other, bar), `scale 1:${scale}`).toBe(false);
          }
          expect(bar.x1).toBeGreaterThan(map.x1);
          expect(bar.x2).toBeLessThan(map.x2);
          expect(bar.y1).toBeGreaterThan(map.y1);
          expect(bar.y2).toBeLessThan(map.y2);
        }
      });
    }
  }

  it("keeps the text on the page next to the line", () => {
    const { pdf, layout } = newPdf("A5", "portrait");
    pdf.setFontSize(6);
    const g = controlLineGeometry(layout, pdf.getTextWidth(CONTROL_LINE_TEXT));
    expect(g.text.y).toBeLessThan(g.line.y);
    expect(g.box.w).toBeGreaterThanOrEqual(CONTROL_LINE_MM);
  });
});

describe("print preferences", () => {
  it("writes ViewerPreferences/PrintScaling /None into the file", () => {
    const { pdf } = newPdf("A4", "portrait");
    applyPrintPreferences(pdf);
    const file = pdf.output();
    expect(file).toContain("/ViewerPreferences");
    expect(file).toContain("/PrintScaling /None");
  });
});

// 1x1 JPEG
const JPEG = Uint8Array.from(atob(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
), (c) => c.charCodeAt(0));

describe("generatePdf output", () => {
  let blobs: Blob[];
  beforeEach(() => {
    blobs = [];
    useMapStore.setState({ baseLayer: "dtk25" });
    usePrintStore.setState({ showScaleBar: null });
    renderMapToImage.mockReset();
    renderMapToImage.mockResolvedValue(JPEG);
    URL.createObjectURL = ((b: Blob) => { blobs.push(b); return "blob:test"; }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
  });

  async function generate(multiPage: boolean, gridRows = 1, overlapMm = 10) {
    usePrintStore.setState({ multiPage, gridCols: 2, gridRows, overlapMm });
    await generatePdf({
      bounds: { west: 10, east: 10.1, south: 56, north: 56.1 },
      scale: 25000, paperFormat: "A4", orientation: "portrait", dpi: 150,
    });
    const file = Buffer.from(await blobs.at(-1)!.arrayBuffer()).toString("latin1");
    // Count the control-line text in the page content streams (uncompressed).
    const texts = file.match(/linjen: den skal v/g) ?? [];
    return { file, texts };
  }

  it("single page has PrintScaling /None and the control line", async () => {
    const { file, texts } = await generate(false);
    expect(file).toContain("/PrintScaling /None");
    expect(texts).toHaveLength(1);
  });

  it("multi page has PrintScaling /None and one control line per page", async () => {
    const { file, texts } = await generate(true);
    expect(file).toContain("/PrintScaling /None");
    expect(texts).toHaveLength(2);
  });

  it.each([5, 15])("keeps both left-hand boxes above the bottom assembly line with %i mm overlap", async (overlapMm) => {
    usePrintStore.setState({ showScaleBar: true });
    const { file } = await generate(true, 2, overlapMm);
    const { layout } = newPdf("A4", "portrait");
    const ptPerMm = 72 / 25.4;
    const boxX = (layout.marginMm + 5) * ptPerMm;
    const mapBottom = (layout.pageHeightMm - layout.marginMm - layout.mapHeightMm) * ptPerMm;
    const assemblyY = mapBottom + overlapMm * ptPerMm;
    const sheets = [...file.matchAll(/\bstream\r?\n([^]*?)\r?\nendstream/g)]
      .map(([, stream]) => stream)
      .filter((stream) => stream.includes("(Ark "));
    expect(sheets).toHaveLength(4);

    for (const [index, sheet] of sheets.entries()) {
      const boxBottoms = [...sheet.matchAll(/^([\d.]+) ([\d.]+) [\d.]+ (-[\d.]+) re\r?\nB$/gm)]
        .filter(([, x]) => Math.abs(Number(x) - boxX) < 0.01)
        .map(([, , top, height]) => Number(top) + Number(height));
      expect(boxBottoms).toHaveLength(2);
      if (index < 2) {
        for (const bottom of boxBottoms) expect(bottom).toBeGreaterThan(assemblyY);
      } else {
        expect(Math.min(...boxBottoms)).toBeCloseTo(mapBottom + 1.5 * ptPerMm, 2);
      }
    }
  });

  it.each([false, true])("emits a scale box only when enabled without a base map (multi-page: %s)", async (multiPage) => {
    useMapStore.setState({ baseLayer: "none" });
    usePrintStore.setState({ showScaleBar: false });
    const { file: withoutScale } = await generate(multiPage);
    usePrintStore.setState({ showScaleBar: true });
    const { file: withScale } = await generate(multiPage);
    const filledAndStrokedBoxes = (file: string) => file.match(/\bre\r?\nB\r?\n/g) ?? [];
    expect(withoutScale).not.toContain("(500 m)");
    expect(withScale.match(/\(500 m\) Tj/g)).toHaveLength(multiPage ? 2 : 1);
    expect(filledAndStrokedBoxes(withScale)).toHaveLength(
      filledAndStrokedBoxes(withoutScale).length + (multiPage ? 2 : 1),
    );
  });
});
