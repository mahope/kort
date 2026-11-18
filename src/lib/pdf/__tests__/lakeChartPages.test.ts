import { afterEach, describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import { calculatePdfLayout } from "../layout";
import { NAVIGATION_WARNING } from "@/lib/map/sources";

// A 2 x 3 px JPEG is enough for jsPDF to read the size from.
const TINY_JPEG = Uint8Array.from(
  atob(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAADAAIBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
  ),
  (c) => c.charCodeAt(0)
);

const charts = {
  type: "FeatureCollection",
  features: [
    { properties: { id: "1", t: "Mossø (Rold Skov)", y: 1981, a: "Thorkild Høy", m: "1:4000", f: "https://x/iiif/3/mosso" }, geometry: { coordinates: [9.886, 56.807] } },
    { properties: { id: "2", t: "Fjern Sø", f: "https://x/iiif/3/fjern" }, geometry: { coordinates: [12, 55.5] } },
    { properties: { id: "3", t: "Hald Sø", f: "https://x/iiif/3/hald" }, geometry: { coordinates: [9.9, 56.81] } },
  ],
};

function mockFetch(failing: string[] = []) {
  const urls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    urls.push(url);
    if (url.endsWith("indsoekort.geojson")) return new Response(JSON.stringify(charts));
    if (failing.some((f) => url.includes(f))) return new Response("", { status: 500 });
    return new Response(TINY_JPEG);
  });
  return urls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

function recordText(pdf: jsPDF): string[] {
  const texts: string[] = [];
  const orig = pdf.text.bind(pdf);
  pdf.text = ((t: string | string[], x: number, y: number, o?: object) => {
    texts.push(...(Array.isArray(t) ? t : [t]));
    return orig(t, x, y, o);
  }) as typeof pdf.text;
  return texts;
}

describe("historical lake charts in the PDF", () => {
  const layout = calculatePdfLayout("A4", "portrait", 150);
  const bounds = { west: 9.8, east: 10, south: 56.7, north: 56.9 };

  it("adds a page per chart inside the print, with the warning, the details and the credit", async () => {
    const urls = mockFetch();
    const { addLakeChartPages } = await import("../lakeChartPages");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const texts = recordText(pdf);
    const images: number[][] = [];
    const origImage = pdf.addImage.bind(pdf);
    pdf.addImage = ((d: Uint8Array, f: string, x: number, y: number, w: number, h: number) => {
      images.push([x, y, w, h]);
      return origImage(d, f, x, y, w, h);
    }) as typeof pdf.addImage;

    expect(await addLakeChartPages(pdf, layout, "portrait", bounds)).toBe(2);
    expect(pdf.getNumberOfPages()).toBe(3);
    expect(urls.filter((u) => u.includes("/full/"))).toHaveLength(2);
    expect(urls.some((u) => u.includes("fjern"))).toBe(false);
    expect(texts).toContain("Bilag: historisk indsøkort over Mossø (Rold Skov)");
    expect(texts.filter((t) => t === NAVIGATION_WARNING)).toHaveLength(2);
    expect(texts.some((t) => t.includes("Thorkild Høy, 1981, 1:4000"))).toBe(true);
    expect(texts.some((t) => t.includes("Geodatastyrelsen, Historiske indsøkort") && t.includes("CC BY 4.0"))).toBe(true);
    // The scan keeps its aspect (2 x 3) and stays inside the margins.
    for (const [x, y, w, h] of images) {
      expect(w / h).toBeCloseTo(2 / 3);
      expect(x).toBeGreaterThanOrEqual(layout.marginMm);
      expect(x + w).toBeLessThanOrEqual(layout.pageWidthMm - layout.marginMm + 0.01);
      expect(y + h).toBeLessThanOrEqual(layout.pageHeightMm - layout.marginMm);
    }
  });

  it("leaves out a chart whose scan cannot be fetched instead of failing the map", async () => {
    mockFetch(["mosso"]);
    const { addLakeChartPages } = await import("../lakeChartPages");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    expect(await addLakeChartPages(pdf, layout, "portrait", bounds)).toBe(1);
    expect(pdf.getNumberOfPages()).toBe(2);
  });

  it("wraps a long title and detail line inside the margins, even on A5", async () => {
    const { drawLakeChartPage } = await import("../lakeChartPages");
    const longChart = {
      id: "9",
      title: "Skanderborg søerne (Tåning Sø, Vrol Sø, Hylke Sø, Storesø, Lillesø og Ringkloster Sø)",
      author: "Farvandsdirektoratets nautiske afdeling, Thorkild Høy",
      year: 1995,
      scale: "1:20000",
      iiif: "https://x/iiif/3/skb",
      lng: 9.9,
      lat: 56.0,
    };
    for (const [format, orientation] of [["A4", "landscape"], ["A4", "portrait"], ["A5", "portrait"]] as const) {
      const l = calculatePdfLayout(format, orientation, 150);
      const pdf = new jsPDF({ unit: "mm", format: format.toLowerCase(), orientation });
      const lines: string[] = [];
      const orig = pdf.text.bind(pdf);
      pdf.text = ((t: string | string[], x: number, y: number, o?: object) => {
        for (const line of Array.isArray(t) ? t : [t]) {
          lines.push(line);
          expect(x + pdf.getTextWidth(line)).toBeLessThanOrEqual(l.pageWidthMm - l.marginMm + 0.01);
        }
        return orig(t, x, y, o);
      }) as typeof pdf.text;
      drawLakeChartPage(pdf, l, { chart: longChart, data: TINY_JPEG });
      const joined = lines.join(" ");
      expect(joined).toContain("Ringkloster Sø)");
      expect(joined).toContain("ikke på dette ark)");
    }
  });

  it("adds nothing when no chart is inside the print", async () => {
    mockFetch();
    const { addLakeChartPages } = await import("../lakeChartPages");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    expect(await addLakeChartPages(pdf, layout, "portrait", { west: 8, east: 8.1, south: 55, north: 55.1 })).toBe(0);
    expect(pdf.getNumberOfPages()).toBe(1);
  });
});
