import { describe, it, expect, afterEach } from "vitest";
import { OVERLAY_LABELS, OVERLAY_SOURCES, SEA_OVERLAYS } from "../sources";
import { offlineLayerIds } from "@/lib/offline/tiles";
import { deserializeState, serializeState } from "@/lib/url/urlState";
import { thirdPartyCredits } from "@/lib/pdf/generator";
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
});
