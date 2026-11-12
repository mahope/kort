import { describe, it, expect } from "vitest";
import { contourLayers, contourSourceUrl, CONTOURS_SOURCE_LAYER, SCREEN_PX_PER_MM } from "../contours";
import { OVERLAY_SOURCES } from "../sources";
import { offlineLayerIds } from "@/lib/offline/tiles";
import type { OverlayId } from "@/types/map";

type Expr = unknown[];
const heights = Array.from({ length: 21 }, (_, i) => i * 5); // 0, 5, ..., 100

/** Evaluates the small filter subset contours.ts uses, for one feature height. */
function evalFilter(f: unknown, h: number): boolean {
  const e = f as Expr;
  switch (e[0]) {
    case "all": return e.slice(1).every((x) => evalFilter(x, h));
    case "!": return !evalFilter(e[1], h);
    case "==": {
      const mod = e[1] as Expr; // ["%", ["to-number", ["get", "h"]], step]
      expect(mod[0]).toBe("%");
      expect(mod[1]).toEqual(["to-number", ["get", "h"]]); // tippecanoe may store h as a string
      return h % (mod[2] as number) === (e[2] as number);
    }
    default: throw new Error(`unexpected ${String(e[0])}`);
  }
}

function shown(interval: 5 | 10, kind: "line" | "index") {
  const layer = contourLayers("k", interval, 1).find((l) => l.id === `k-${kind}`)!;
  return heights.filter((h) => evalFilter((layer as { filter: unknown }).filter, h));
}

describe("contour layers", () => {
  it("5 m: thin lines every 5 m, index lines every 25 m", () => {
    expect(shown(5, "line")).toEqual([5, 10, 15, 20, 30, 35, 40, 45, 55, 60, 65, 70, 80, 85, 90, 95]);
    expect(shown(5, "index")).toEqual([0, 25, 50, 75, 100]);
  });

  it("10 m: thin lines every 10 m, index lines every 50 m", () => {
    expect(shown(10, "line")).toEqual([10, 20, 30, 40, 60, 70, 80, 90]);
    expect(shown(10, "index")).toEqual([0, 50, 100]);
  });

  it("gives the same line weight on paper at any dpi", () => {
    const width = (pxPerMm: number) =>
      (contourLayers("k", 5, 1, pxPerMm).find((l) => l.id === "k-index") as { paint: { "line-width": number } }).paint["line-width"];
    const at300 = 300 / 25.4;
    expect(width(at300) / at300).toBeCloseTo(width(SCREEN_PX_PER_MM) / SCREEN_PX_PER_MM, 6);
    expect(width(SCREEN_PX_PER_MM)).toBeGreaterThan(0.9); // about 1 px on screen
  });

  it("labels index lines with the height, reads the kurver layer from PMTiles", () => {
    const layers = contourLayers("k", 10, 0.7);
    for (const l of layers) expect((l as { "source-layer": string })["source-layer"]).toBe(CONTOURS_SOURCE_LAYER);
    const label = layers.find((l) => l.type === "symbol") as { layout: Record<string, unknown>; filter: unknown };
    expect(label.layout["text-field"]).toEqual(["to-string", ["get", "h"]]);
    // Heights from zoom 12: 1:25.000 on screen and 1:50.000 in a 150 dpi PDF.
    expect((label as { minzoom?: number }).minzoom).toBe(12);
    expect(evalFilter(label.filter, 50)).toBe(true);
    expect(evalFilter(label.filter, 40)).toBe(false);
    expect(contourSourceUrl()).toMatch(/^pmtiles:\/\/https:\/\/.+\.pmtiles$/);
  });

  it("are vector overlays that are not saved offline", () => {
    for (const id of ["kurver5", "kurver10"] as OverlayId[]) {
      expect(OVERLAY_SOURCES[id].contourInterval).toBeTruthy();
      expect(offlineLayerIds("dtk25", [{ id, enabled: true }])).not.toContain(id);
    }
  });
});
