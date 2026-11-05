import { describe, it, expect, afterEach, vi } from "vitest";
import { jsPDF } from "jspdf";
import { calculatePdfLayout } from "../layout";
import { drawDeclination, loadDeclinationDiagram } from "../generator";
import { usePrintStore } from "@/stores/printStore";

const bounds = { north: 55.7, south: 55.6, east: 12.6, west: 12.5 };

function draw(showDeclination: boolean, zone: number | null) {
  usePrintStore.setState({ showDeclination });
  const l = calculatePdfLayout("A4", "portrait", 150);
  const pdf = new jsPDF({ unit: "mm", format: [l.pageWidthMm, l.pageHeightMm] });
  const text = vi.spyOn(pdf, "text");
  return loadDeclinationDiagram().then((diagram) => {
    drawDeclination(diagram, pdf, l, bounds, zone === null ? null : ({ zone } as never), 0);
    return text.mock.calls.map((c) => String(c[0]));
  });
}

describe("PDF declination integration", () => {
  afterEach(() => {
    vi.useRealTimers();
    usePrintStore.setState({ showDeclination: true });
  });

  it("draws the diagram (called once per page, so also on page 2+) when switched on", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 5)));
    const texts = await draw(true, 32);
    expect(texts).toContain("Magnetisk nord");
    expect(texts).toContain("Gitternord");
    expect(texts.some((t) => t.startsWith("Misvisning 2026"))).toBe(true);
  });

  it("omits grid north without a grid", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 5)));
    const texts = await draw(true, null);
    expect(texts).toContain("Magnetisk nord");
    expect(texts).not.toContain("Gitternord");
  });

  it("draws nothing when switched off", async () => {
    expect(await draw(false, 32)).toEqual([]);
  });

  it("draws nothing once the model has expired", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.UTC(2030, 0, 2)));
    expect(await draw(true, 32)).toEqual([]);
  });
});
