import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsPDF } from "jspdf";

vi.mock("maplibre-gl", () => ({ default: {}, setWorkerUrl: () => {} }));
const renderMapToImage = vi.hoisted(() => vi.fn());
vi.mock("../renderer", () => ({ renderMapToImage }));

import { PAPER_FORMATS } from "@/constants/paperFormats";
import type { Orientation, PaperFormat } from "@/types/print";
import { usePrintStore } from "@/stores/printStore";
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
const SCALES = [1000, 5000, 25000, 50000, 100000, 250000];

function newPdf(format: PaperFormat, orientation: Orientation) {
  const layout = calculatePdfLayout(format, orientation, 150);
  const pdf = new jsPDF({ orientation, unit: "mm", format: [layout.pageWidthMm, layout.pageHeightMm] });
  return { pdf, layout };
}

describe("control line", () => {
  for (const format of FORMATS) {
    for (const orientation of ORIENTATIONS) {
      it(`is 100 mm and clear of scale bar, north arrow and attribution (${format} ${orientation})`, () => {
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
          const bar = recordBox(pdf, () => drawScaleBar(pdf, layout, scale));
          expect(overlaps(control, bar), `scale 1:${scale}`).toBe(false);
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
    renderMapToImage.mockReset();
    renderMapToImage.mockResolvedValue(JPEG);
    URL.createObjectURL = ((b: Blob) => { blobs.push(b); return "blob:test"; }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
  });

  async function generate(multiPage: boolean) {
    usePrintStore.setState({ multiPage, gridCols: 2, gridRows: 1, overlapMm: 10 });
    await generatePdf({
      bounds: { west: 10, east: 10.1, south: 56, north: 56.1 },
      scale: 25000, paperFormat: "A4", orientation: "portrait", dpi: 150,
    });
    const file = Buffer.from(await blobs[0].arrayBuffer()).toString("latin1");
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
});
