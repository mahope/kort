import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { depthLayers, SCREEN_PX_PER_MM, VARIANTS, withDepth } from "./style.mjs";

const PRINT_PX_PER_MM = 300 / 25.4;

/** A minimal skærmkort: sea, land, lakes, a road and two place-name layers. */
const BASE = {
  version: 8,
  glyphs: "https://example.invalid/{fontstack}/{range}.pbf",
  sources: { v: { type: "vector", tiles: ["https://example.invalid/{z}/{x}/{y}"] } },
  layers: [
    { id: "vand_hav", type: "fill", source: "v", "source-layer": "vand" },
    { id: "natur_land", type: "fill", source: "v", "source-layer": "natur" },
    { id: "vandloebsnavne", type: "symbol", source: "v", "source-layer": "tekst_linje" },
    { id: "vand_sø", type: "fill", source: "v", "source-layer": "vand" },
    { id: "vand_sø_outline", type: "line", source: "v", "source-layer": "vand" },
    { id: "veje_primær", type: "line", source: "v", "source-layer": "veje" },
    { id: "tekst_punkt_by", type: "symbol", source: "v", "source-layer": "tekst_punkt" },
  ],
};

describe("depth style", () => {
  it.each(Object.keys(VARIANTS))("%s is a valid MapLibre style on the skærmkort", (variant) => {
    const style = withDepth(BASE, "dybder", "pmtiles://https://example.invalid/soekort.pmtiles", "", { variant });
    expect(validateStyleMin(style)).toEqual([]);
  });

  it("puts sea layers under the land, lake layers over the lake fill and labels under the place names", () => {
    const ids = withDepth(BASE, "dybder", "pmtiles://x", "", {}).layers.map((l) => l.id);
    const at = (id) => ids.indexOf(id);
    expect(at("dybder-areas-sea")).toBe(at("vand_hav") + 1);
    expect(at("dybder-areas-sea")).toBeLessThan(at("natur_land"));
    expect(at("dybder-areas-lake")).toBeGreaterThan(at("vand_sø_outline"));
    expect(at("dybder-contour-labels-major")).toBeGreaterThan(at("veje_primær"));
    expect(at("dybder-contour-labels-major")).toBeLessThan(at("tekst_punkt_by"));
  });

  it("hides minor contour numbers wherever their lines are hidden", () => {
    for (const variant of Object.keys(VARIANTS)) {
      const { sea, labels } = depthLayers("d", { variant });
      const minorLine = sea.find((l) => l.id === "d-minor-sea");
      const minorLabels = labels.find((l) => l.id === "d-contour-labels-minor");
      expect(minorLabels.minzoom).toBe(minorLine.minzoom);
    }
  });

  it("shows the same things at the same scale on screen and at 300 dpi", () => {
    const screen = depthLayers("d", { pxPerMm: SCREEN_PX_PER_MM }).labels;
    const print = depthLayers("d", { pxPerMm: PRINT_PX_PER_MM }).labels;
    const shift = Math.log2(300 / 96);
    for (const [i, layer] of screen.entries()) {
      if (layer.minzoom === undefined) continue;
      expect(print[i].minzoom).toBeCloseTo(layer.minzoom + shift, 6);
    }
    // Text is millimetres on paper at print dpi (the screen pixel floor does not apply).
    expect(print[0].layout["text-size"]).toBeCloseTo(1.75 * PRINT_PX_PER_MM, 6);
  });
});
