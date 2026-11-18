import { describe, it, expect } from "vitest";
import { DATA_SOURCES } from "../dataSources";
import { BASE_LAYERS } from "../baseLayers";
import { OVERLAY_SOURCES } from "@/lib/map/sources";
import type { OverlayId } from "@/types/map";

describe("sources page data", () => {
  const listed = DATA_SOURCES.flatMap((s) => s.layers ?? []);

  it("lists every base map and overlay, so no layer ships without its licence", () => {
    // "Intet basiskort" shows no outside data, so it has no source.
    for (const b of BASE_LAYERS) if (b.value !== "none") expect(listed).toContain(b.value);
    for (const id of Object.keys(OVERLAY_SOURCES) as OverlayId[]) expect(listed).toContain(id);
  });

  it("lists each layer under one source only", () => {
    expect(new Set(listed).size).toBe(listed.length);
  });

  it("gives every source a licence link and a credit", () => {
    for (const s of DATA_SOURCES) {
      expect(s.licenceUrl).toMatch(/^https:\/\//);
      expect(s.licence).toBeTruthy();
      expect(s.credit).toBeTruthy();
    }
  });

  it("dates every snapshot we serve ourselves", () => {
    for (const id of ["soedybder", "indsoekort", "vrag"]) {
      expect(DATA_SOURCES.find((s) => s.layers?.includes(id as OverlayId))?.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("marks exactly the not-for-navigation overlays as such", () => {
    for (const s of DATA_SOURCES) {
      for (const id of s.layers ?? []) {
        const overlay = OVERLAY_SOURCES[id as OverlayId];
        if (overlay) expect(Boolean(s.notForNavigation)).toBe(Boolean(overlay.notForNavigation));
      }
    }
  });
});
