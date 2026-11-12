import { describe, it, expect, afterEach } from "vitest";
import { OVERLAY_LABELS, OVERLAY_SOURCES, SEA_OVERLAYS } from "../sources";
import { offlineLayerIds } from "@/lib/offline/tiles";
import { deserializeState, serializeState } from "@/lib/url/urlState";
import { thirdPartyCredits, drawThirdPartyCredits, overviewCreditsBox } from "@/lib/pdf/generator";
import { overviewPlacement } from "@/lib/pdf/assembly";
import { calculatePdfLayout } from "@/lib/pdf/layout";
import { jsPDF } from "jspdf";
import { useMapStore } from "@/stores/mapStore";
import type { OverlayId } from "@/types/map";

const all = Object.keys(OVERLAY_SOURCES) as OverlayId[];

describe("overlay layers", () => {
  it("every overlay has a label and a URL code that round-trips", () => {
    for (const id of all) {
      expect(OVERLAY_LABELS[id]).toBeTruthy();
      const qs = serializeState({ overlays: [{ id, opacity: 0.6 }] });
      expect(deserializeState(qs).overlays).toEqual([{ id, opacity: 0.6 }]);
    }
  });

  it("uses the smoothed 2.5 m contours for contours25", () => {
    expect(OVERLAY_SOURCES.contours25.tiles[0]).toContain("LAYERS=dhm_kurve_traditionel");
  });

  it("marks the sea layers as not for navigation and keeps them out of offline saving", () => {
    for (const id of SEA_OVERLAYS) {
      expect(OVERLAY_SOURCES[id].notForNavigation).toBe(true);
      expect(OVERLAY_SOURCES[id].attribution).toMatch(/Ikke til navigation/);
    }
    const ids = offlineLayerIds("dtk25", all.map((id) => ({ id, enabled: true })));
    expect(ids).toContain("contours25");
    expect(ids).not.toContain("havdybder");
    expect(ids).not.toContain("soemaerker");
  });
});

describe("PDF credits", () => {
  const initial = useMapStore.getState();
  afterEach(() => useMapStore.setState({ baseLayer: initial.baseLayer, overlays: initial.overlays }));

  it("is empty for Klimadatastyrelsen-only maps", () => {
    expect(thirdPartyCredits()).toEqual({ credits: [], notForNavigation: false });
  });

  it("credits OSM, EMODnet and OpenSeaMap and says not for navigation", () => {
    useMapStore.setState({
      baseLayer: "osm",
      overlays: initial.overlays.map((o) => ({ ...o, enabled: SEA_OVERLAYS.includes(o.id) })),
    });
    const c = thirdPartyCredits();
    expect(c.notForNavigation).toBe(true);
    expect(c.credits.join(" ")).toMatch(/OpenStreetMap/);
    expect(c.credits.join(" ")).toMatch(/EMODnet/);
    expect(c.credits.join(" ")).toMatch(/OpenSeaMap/);
  });

  it("puts the credits inside the map image, wrapped to fit A5, clear of the margins", () => {
    useMapStore.setState({
      baseLayer: "osm",
      overlays: initial.overlays.map((o) => ({ ...o, enabled: SEA_OVERLAYS.includes(o.id) })),
    });
    const layout = calculatePdfLayout("A5", "portrait", 150);
    const pdf = new jsPDF({ unit: "mm", format: "a5" });
    const texts: { t: string; x: number; y: number; w: number }[] = [];
    const rects: number[][] = [];
    const origText = pdf.text.bind(pdf);
    pdf.text = ((t: string, x: number, y: number, o?: object) => {
      texts.push({ t, x, y, w: pdf.getTextWidth(t) });
      return origText(t, x, y, o);
    }) as typeof pdf.text;
    const origRect = pdf.rect.bind(pdf);
    pdf.rect = ((x: number, y: number, w: number, h: number, st?: string) => {
      rects.push([x, y, w, h]);
      return origRect(x, y, w, h, st);
    }) as typeof pdf.rect;
    const m = layout.marginMm;
    drawThirdPartyCredits(pdf, m + 1.5, m + 1.5, Math.min(110, layout.mapWidthMm - 24));
    expect(texts[0].t).toBe("IKKE TIL NAVIGATION");
    expect(texts.map((t) => t.t).join(" ")).toMatch(/EMODnet/);
    expect(texts.length).toBeGreaterThan(3); // the OSM/EMODnet/OpenSeaMap credits wrap on A5
    const [bx, by, bw, bh] = rects[0];
    expect(bx).toBeGreaterThan(m);
    expect(by).toBeGreaterThan(m);
    expect(bx + bw).toBeLessThan(m + layout.mapWidthMm - 20); // clear of the north arrow
    expect(by + bh).toBeLessThan(m + layout.mapHeightMm);
    for (const t of texts) {
      expect(t.x + t.w).toBeLessThanOrEqual(bx + bw + 0.01);
      expect(t.y).toBeLessThan(by + bh);
    }
  });

  it("places the overview credits beside a narrow sheet strip instead of squeezing them", () => {
    const layout = calculatePdfLayout("A5", "portrait", 150);
    // 1 x 5 sheets on A5: a tall, narrow overview image.
    const place = overviewPlacement(layout, 1000, 5000);
    const box = overviewCreditsBox(layout.marginMm, place);
    expect(box.width).toBeGreaterThanOrEqual(40);
    expect(box.x + box.width).toBeLessThanOrEqual(place.x);
    // A wide image keeps the box inside it.
    const wide = overviewPlacement(calculatePdfLayout("A4", "portrait", 150), 3000, 3000);
    const inside = overviewCreditsBox(10, wide);
    expect(inside.x).toBeGreaterThan(wide.x);
    expect(inside.x + inside.width).toBeLessThan(wide.x + wide.w);
  });
});
