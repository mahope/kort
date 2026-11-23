import { describe, it, expect } from "vitest";
import {
  createPropertyExpression,
  featureFilter,
  latest,
  validateStyleMin,
  type FilterSpecification,
  type StylePropertySpecification,
} from "@maplibre/maplibre-gl-style-spec";
import type { LayerSpecification } from "maplibre-gl";
import {
  DATA_TIERS,
  SOEKORT_VARIANTS,
  soekortAnchors,
  soekortLayers,
  soekortLayersWithAnchors,
  type SoekortVariant,
} from "../soekortStyle";

const SCREEN_PX_PER_MM = 96 / 25.4;
const PRINT_PX_PER_MM = 300 / 25.4;
const variants = Object.keys(SOEKORT_VARIANTS) as SoekortVariant[];

/** A minimal skærmkort with the real layer ids around the insertion points. */
const BASE_LAYERS = [
  { id: "vand_hav", type: "fill", source: "v", "source-layer": "vand" },
  { id: "linje_færgerute", type: "line", source: "v", "source-layer": "tekst_linje" },
  { id: "natur_land", type: "fill", source: "v", "source-layer": "natur" },
  { id: "vandloebsnavne", type: "symbol", source: "v", "source-layer": "tekst_linje" },
  { id: "vand_sø", type: "fill", source: "v", "source-layer": "vand" },
  { id: "vand_sø_outline", type: "line", source: "v", "source-layer": "vand" },
  { id: "vand_sø_>50000", type: "fill", source: "v", "source-layer": "vand" },
  { id: "veje_primær", type: "line", source: "v", "source-layer": "veje" },
  { id: "tekst_punkt_by", type: "symbol", source: "v", "source-layer": "tekst_punkt" },
] as LayerSpecification[];

/** The style the map ends up with: the layers inserted at their anchors, as MapLibre's addLayer(layer, beforeId) does. */
function withSoekort(variant: SoekortVariant, anchors = soekortAnchors(BASE_LAYERS)) {
  const layers = [...BASE_LAYERS];
  for (const { layer, beforeId } of soekortLayersWithAnchors("d", anchors, { variant })) {
    const at = beforeId ? layers.findIndex((l) => l.id === beforeId) : layers.length;
    layers.splice(at, 0, layer);
  }
  return {
    version: 8 as const,
    glyphs: "https://example.invalid/{fontstack}/{range}.pbf",
    sources: {
      v: { type: "vector" as const, tiles: ["https://example.invalid/{z}/{x}/{y}"] },
      d: { type: "vector" as const, url: "pmtiles://https://example.invalid/soekort.pmtiles" },
    },
    layers,
  };
}

// The features one data tier of soekort.pmtiles holds (as build.py writes them).
type Feature = { type: 1; properties: Record<string, string | number>; geometry: [] };
function tierFeatures(t: (typeof DATA_TIERS)[number]): Feature[] {
  const features: Feature[] = [];
  const add = (properties: Record<string, string | number>) => features.push({ type: 1, properties, geometry: [] });
  const sources: [string, number[]][] = [["ddm", t.ddm], ["emodnet", t.emodnet], ...(t.lakes ? [["novana", DATA_TIERS[2].ddm] as [string, number[]]] : [])];
  for (const [src, levels] of sources) {
    for (const [i, d0] of [0, ...levels].entries()) add({ layer: "depth_areas", src, d0, ...(levels[i] !== undefined ? { d1: levels[i] } : {}) });
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
const tierAt = (zoom: number) => DATA_TIERS.findLast((t) => t.from <= Math.min(14, Math.floor(zoom)))!;

// Water depths to sample the band colours at (the tiers cut the bands at different depths).
const SAMPLE_DEPTHS = [0.5, 1.5, 2.5, 4, 7, 12, 17, 25, 40, 70, 150, 300];

type AnyLayer = { id: string; type: string; filter?: unknown; minzoom?: number; maxzoom?: number; "source-layer"?: string; paint?: Record<string, unknown> };

/** Everything the layers draw at a zoom, from the tier loaded there: band colour per sample depth, each line and number. */
function visible(layers: AnyLayer[], zoom: number): Set<string> {
  const out = new Set<string>();
  const features = tierFeatures(tierAt(zoom));
  for (const layer of layers) {
    if ((layer.minzoom ?? 0) > zoom || (layer.maxzoom ?? 99) <= zoom) continue;
    const id = layer.id.replace(/-z\d+$/, "");
    const filter = featureFilter(layer.filter as FilterSpecification, "filter");
    const shown = features.filter((f) => f.properties.layer === layer["source-layer"] && filter.filter({ zoom }, f as never));
    if (layer.type === "fill") {
      const parsed = createPropertyExpression(
        layer.paint!["fill-color"],
        "fill-color",
        latest.paint_fill["fill-color"] as StylePropertySpecification
      );
      if (parsed.result !== "success") throw new Error("bad fill-color");
      for (const depth of SAMPLE_DEPTHS) {
        for (const f of shown.filter(({ properties: p }) => (p.d0 as number) <= depth && depth < ((p.d1 as number) ?? Infinity))) {
          out.add(`${id} ${f.properties.src} ${depth} m: ${parsed.value.evaluate({ zoom }, f as never)}`);
        }
      }
    } else {
      for (const f of shown) out.add(`${id} ${JSON.stringify(f.properties)}`);
    }
  }
  return out;
}

const all = (o: ReturnType<typeof soekortLayers>) => [...o.sea, ...o.lake, ...o.labels] as unknown as AnyLayer[];

describe("søkort style", () => {
  it.each(variants)("%s is a valid MapLibre style on the skærmkort and over a raster base map", (variant) => {
    expect(validateStyleMin(withSoekort(variant))).toEqual([]);
    expect(validateStyleMin(withSoekort(variant, null))).toEqual([]);
  });

  it("puts sea layers under the land, lake layers over the lake fills and labels under the place names", () => {
    const ids = withSoekort("klassisk").layers.map((l) => l.id);
    const at = (id: string) => ids.indexOf(id);
    expect(at("d-areas-sea-z5")).toBe(at("vand_hav") + 1);
    expect(at("d-safety-sea-z12")).toBeLessThan(at("natur_land"));
    expect(at("d-areas-lake-z9")).toBeGreaterThan(at("vand_sø_>50000"));
    expect(at("d-areas-lake-z9")).toBeLessThan(at("veje_primær"));
    expect(at("d-contour-labels-major-z5")).toBeGreaterThan(at("veje_primær"));
    expect(at("d-soundings-z12")).toBeLessThan(at("tekst_punkt_by"));
  });

  it("finds the insertion points between layers the app has added on top", () => {
    const app = [
      { id: "soekort-overlay-areas-sea-z5", type: "fill", source: "soekort-overlay" },
      { id: "hillshade-overlay-layer", type: "raster", source: "hillshade-overlay" },
    ];
    const layers = [BASE_LAYERS[0], app[0], ...BASE_LAYERS.slice(1), app[1]];
    const isBase = (l: { id: string }) => !app.some((a) => a.id === l.id);
    expect(soekortAnchors(layers, isBase)).toEqual({ sea: "linje_færgerute", lake: "veje_primær", labels: "tekst_punkt_by" });
  });

  it("has no insertion points without a skærmkort, and then leaves the bands out", () => {
    expect(soekortAnchors([{ id: "background", type: "background" }])).toBeNull();
    const layers = soekortLayersWithAnchors("d", null);
    expect(layers.length).toBeGreaterThan(0);
    expect(layers.some(({ layer }) => layer.type === "fill")).toBe(false);
    expect(layers.every(({ beforeId }) => beforeId === undefined)).toBe(true);
    expect(soekortLayersWithAnchors("d", soekortAnchors(BASE_LAYERS)).some(({ layer }) => layer.type === "fill")).toBe(true);
  });

  it("hides minor contour numbers wherever their lines are hidden", () => {
    for (const variant of variants) {
      const { sea, labels } = soekortLayers("d", { variant });
      const range = (l: LayerSpecification) => [l.minzoom, l.maxzoom];
      const minorLines = sea.filter((l) => l.id.startsWith("d-minor-sea-")).map(range);
      const minorLabels = labels.filter((l) => l.id.startsWith("d-contour-labels-minor-")).map(range);
      expect(minorLabels).toEqual(minorLines);
    }
  });

  it("scales text and lines to millimetres on paper at print dpi and shifts the zooms", () => {
    const print = soekortLayers("d", { pxPerMm: PRINT_PX_PER_MM });
    const screen = soekortLayers("d", { pxPerMm: SCREEN_PX_PER_MM });
    // The screen pixel floor does not apply at 300 dpi.
    const label = print.labels[0] as { layout: Record<string, unknown> };
    expect(label.layout["text-size"]).toBeCloseTo(1.75 * PRINT_PX_PER_MM, 6);
    const safety = print.sea.find((l) => l.id.startsWith("d-safety-sea-")) as { paint: Record<string, unknown> };
    expect(safety.paint["line-width"]).toBeCloseTo(0.26 * PRINT_PX_PER_MM, 6);
    const shoals = (o: typeof print) => o.labels.find((l) => l.id.startsWith("d-shoals-"))!.minzoom!;
    expect(shoals(print) - shoals(screen)).toBeCloseTo(Math.log2(300 / 96), 6);
  });

  it("gives the shallow-water variant a band for each of the first metres", () => {
    expect(SOEKORT_VARIANTS.lavvande.bands.map(([d]) => d)).toEqual([0, 1, 2, 3, 5, 10]);
    expect(SOEKORT_VARIANTS.klassisk.bands.map(([d]) => d)).toEqual([0, 2, 5, 10, 20]);
  });

  it.each(variants)("%s shows the same things at the same scale on screen and at 300 dpi", (variant) => {
    const screen = all(soekortLayers("d", { variant, pxPerMm: SCREEN_PX_PER_MM }));
    const print = all(soekortLayers("d", { variant, pxPerMm: PRINT_PX_PER_MM }));
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
