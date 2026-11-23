import { createPropertyExpression, featureFilter, latest, validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { DATA_TIERS, depthLayers, SCREEN_PX_PER_MM, VARIANTS, withDepth } from "./style.mjs";

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

// The features one data tier of soekort.pmtiles holds (as build.py writes them).
function tierFeatures(t) {
  const features = [];
  const add = (properties) => features.push({ type: 1, properties, geometry: [] });
  const sources = [["ddm", t.ddm], ["emodnet", t.emodnet], ...(t.lakes ? [["novana", DATA_TIERS[2].ddm]] : [])];
  for (const [src, levels] of sources) {
    for (const [i, d0] of [0, ...levels].entries()) add({ layer: "depth_areas", src, d0, d1: levels[i] });
    for (const d of levels) {
      add({ layer: "depth_contours", src, d });
      add({ layer: "depth_labels", src, d, k: "c" });
    }
  }
  if (t.soundings) {
    for (const d of [0.4, 1.3, 2.7, 4.9, 8.2, 12.5, 25]) for (const k of ["s", "g"]) add({ layer: "depth_labels", src: "ddm", d, k });
  }
  return features;
}

// Tiles at the canvas zoom rounded down, overzoomed past 14 (pixel ratio 1, as in the app's PDF).
const tierAt = (zoom) => DATA_TIERS.findLast((t) => t.from <= Math.min(14, Math.floor(zoom)));

// Water depths to sample the band colours at (the tiers cut the bands at different depths).
const SAMPLE_DEPTHS = [0.5, 1.5, 2.5, 4, 7, 12, 17, 25, 40, 70, 150, 300];

/**
 * Everything the layers draw at a zoom, from the tier loaded at that zoom:
 * the band colour at each sample depth, and each line and number.
 */
function visible(layers, zoom) {
  const out = new Set();
  const features = tierFeatures(tierAt(zoom));
  for (const layer of layers) {
    if ((layer.minzoom ?? 0) > zoom || (layer.maxzoom ?? 99) <= zoom) continue;
    const id = layer.id.replace(/-z\d+$/, "");
    const filter = featureFilter(layer.filter, "filter");
    const shown = features.filter((f) => f.properties.layer === layer["source-layer"] && filter.filter({ zoom }, f));
    if (layer.type === "fill") {
      const colour = createPropertyExpression(layer.paint["fill-color"], "fill-color", latest.paint_fill["fill-color"]).value;
      for (const depth of SAMPLE_DEPTHS) {
        for (const f of shown.filter(({ properties: p }) => p.d0 <= depth && depth < (p.d1 ?? Infinity))) {
          out.add(`${id} ${f.properties.src} ${depth} m: ${colour.evaluate({ zoom }, f)}`);
        }
      }
    } else {
      for (const f of shown) out.add(`${id} ${JSON.stringify(f.properties)}`);
    }
  }
  return out;
}

describe("depth style", () => {
  it.each(Object.keys(VARIANTS))("%s is a valid MapLibre style on the skærmkort", (variant) => {
    const style = withDepth(BASE, "dybder", "pmtiles://https://example.invalid/soekort.pmtiles", "", { variant });
    expect(validateStyleMin(style)).toEqual([]);
  });

  it("puts sea layers under the land, lake layers over the lake fill and labels under the place names", () => {
    const ids = withDepth(BASE, "dybder", "pmtiles://x", "", {}).layers.map((l) => l.id);
    const at = (id) => ids.indexOf(id);
    expect(at("dybder-areas-sea-z5")).toBe(at("vand_hav") + 1);
    expect(at("dybder-safety-sea-z12")).toBeLessThan(at("natur_land"));
    expect(at("dybder-areas-lake-z9")).toBeGreaterThan(at("vand_sø_outline"));
    expect(at("dybder-contour-labels-major-z5")).toBeGreaterThan(at("veje_primær"));
    expect(at("dybder-soundings-z12")).toBeLessThan(at("tekst_punkt_by"));
  });

  it("hides minor contour numbers wherever their lines are hidden", () => {
    for (const variant of Object.keys(VARIANTS)) {
      const { sea, labels } = depthLayers("d", { variant });
      const range = (l) => [l.minzoom, l.maxzoom];
      const minorLines = sea.filter((l) => l.id.startsWith("d-minor-sea-")).map(range);
      const minorLabels = labels.filter((l) => l.id.startsWith("d-contour-labels-minor-")).map(range);
      expect(minorLabels).toEqual(minorLines);
    }
  });

  it("scales text to millimetres on paper at print dpi", () => {
    const print = depthLayers("d", { pxPerMm: PRINT_PX_PER_MM }).labels;
    // The screen pixel floor does not apply at 300 dpi.
    expect(print[0].layout["text-size"]).toBeCloseTo(1.75 * PRINT_PX_PER_MM, 6);
  });

  it.each(Object.keys(VARIANTS))("%s shows the same things at the same scale on screen and at 300 dpi", (variant) => {
    const all = (o) => [...o.sea, ...o.lake, ...o.labels];
    const screen = all(depthLayers("d", { variant, pxPerMm: SCREEN_PX_PER_MM }));
    const print = all(depthLayers("d", { variant, pxPerMm: PRINT_PX_PER_MM }));
    const shift = Math.log2(300 / 96);
    // The PDF loads a finer tier: Det Sydfynske Øhav at 1:50.000 is zoom 11.7 on screen (tier 9-11)
    // and 13.4 at 300 dpi (tier 12-14, with 1 m and 3 m bands and soundings).
    for (const zoom of [6.3, 8.6, 9.5, 10.7, 11.2, 11.7, 12.1, 12.7, 13.6, 14.6]) {
      const onScreen = visible(screen, zoom);
      const onPaper = visible(print, zoom + shift);
      expect([...onPaper].filter((x) => !onScreen.has(x)), `only on paper at screen zoom ${zoom}`).toEqual([]);
      expect([...onScreen].filter((x) => !onPaper.has(x)), `only on screen at zoom ${zoom}`).toEqual([]);
    }
  });
});
