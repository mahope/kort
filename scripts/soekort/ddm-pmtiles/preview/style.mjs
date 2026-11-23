// MapLibre layers for soekort.pmtiles (depth_areas, depth_contours, depth_labels).
// Plain ESM without dependencies, so the preview page and the style export share it;
// phase 2 ports it to TypeScript next to src/lib/map/vectorOverlays.ts.
//
// Sizes are millimetres on paper converted with pxPerMm (as in the app), so a
// 300 dpi PDF gets the same weights as the screen. Zoom thresholds are given for
// the screen (96 dpi) and shifted by the same factor: 1:25.000 is zoom 12.7 on
// screen and 14.3 in a 300 dpi PDF, and both show the same things.

export const SCREEN_PX_PER_MM = 96 / 25.4;
const FONT = ["Open Sans Regular"];

/**
 * Three variants. `bands` are [from-depth, colour]; the first entry is from 0 m.
 * `major` contours are drawn heavier; `minorMinZoom` hides the in-between lines
 * (1, 3, 15, 30 m) at small scales; soundings show from `shoalMinZoom` (shoals)
 * and `gridMinZoom` (regular grid). Zooms are screen zooms.
 */
export const VARIANTS = {
  // Paper-chart look: five tints, shallow water darkest, deep water nearly white.
  klassisk: {
    label: "Klassisk søkort",
    bands: [[0, "#8fc1e6"], [2, "#aed2ee"], [5, "#cce3f5"], [10, "#e3f0fa"], [20, "#f5f9fd"]],
    line: "#4f7fae",
    major: [2, 5, 10, 20, 50, 100, 200],
    safety: [2, 5],
    minorMinZoom: 12,
    labelColor: "#2d5d8c",
    shoalMinZoom: 11.5,
    gridMinZoom: 13.5,
  },
  // Kayak, canoe and dinghy: the first five metres split metre by metre.
  lavvande: {
    label: "Lavt vand (kano og kajak)",
    bands: [[0, "#7fb6e0"], [1, "#9cc8ea"], [2, "#b6d7f0"], [3, "#cde4f5"], [5, "#e3f0fa"], [10, "#f6fafd"]],
    line: "#4f7fae",
    major: [1, 2, 3, 5, 10, 20, 50],
    safety: [1, 2, 3],
    minorMinZoom: 11,
    labelColor: "#2d5d8c",
    shoalMinZoom: 11,
    gridMinZoom: 12.5,
  },
  // Little ink: two shallow tints, white beyond 5 m, darker labelled lines.
  // Holds up on a laser printer and over DTK25 or aerial photos.
  linjer: {
    label: "Linjer (sparsomt blæk)",
    bands: [[0, "#c4def2"], [2, "#e2eff9"], [5, "#ffffff"]],
    line: "#2f6496",
    major: [2, 5, 10, 20, 50, 100, 200],
    safety: [2, 5],
    minorMinZoom: 12.5,
    labelColor: "#1f4f7d",
    shoalMinZoom: 12,
    gridMinZoom: 14,
  },
};

const inList = (values) => ["in", ["get", "d"], ["literal", values]];

/** Depth number: whole metres, and below 10 m the decimal in a smaller size (as on charts). */
function soundingText() {
  const d = ["get", "d"];
  const whole = ["floor", d];
  const tenth = ["round", ["*", ["-", d, whole], 10]];
  return [
    "case",
    ["all", ["<", d, 10], [">", tenth, 0]],
    ["format", ["to-string", whole], {}, ["to-string", tenth], { "font-scale": 0.72 }],
    ["format", ["to-string", whole], {}],
  ];
}

/**
 * Layers in three groups, so a caller can put them at the right place in a base
 * map: `under` (bands and lines, below the base map's land), `labels` (above the
 * land, below the base map's own place names).
 */
export function depthLayers(sourceId, { variant = "klassisk", pxPerMm = SCREEN_PX_PER_MM, opacity = 1 } = {}) {
  const v = VARIANTS[variant];
  const mm = pxPerMm;
  // Millimetres on paper, but never below a readable pixel size on screen
  // (1.75 mm is only 6.6 px at 96 dpi; at 300 dpi it is 20.7 px and the floor never applies).
  const size = (millimetres, minPx) => Math.max(millimetres * mm, minPx);
  const z = (screenZoom) => screenZoom + Math.log2(pxPerMm / SCREEN_PX_PER_MM);
  const fill = ["step", ["get", "d0"], v.bands[0][1], ...v.bands.slice(1).flat()];
  const lastBand = v.bands[v.bands.length - 1][0];
  const major = inList(v.major);
  const safety = inList(v.safety);
  const shown = [...new Set([...v.major, 1, 2, 3, 5, 10, 15, 20, 30, 50, 100, 200])].filter(
    (d) => variant !== "linjer" || d >= 2
  );

  const under = [
    {
      id: `${sourceId}-areas`,
      type: "fill",
      source: sourceId,
      "source-layer": "depth_areas",
      // Deeper than the last band shares its colour; no polygon edges inside.
      paint: { "fill-color": fill, "fill-opacity": opacity, "fill-antialias": false },
    },
    {
      id: `${sourceId}-minor`,
      type: "line",
      source: sourceId,
      "source-layer": "depth_contours",
      minzoom: z(v.minorMinZoom),
      filter: ["all", ["!", major], inList(shown)],
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": v.line, "line-width": size(0.1, 0.5), "line-opacity": 0.8 * opacity },
    },
    {
      id: `${sourceId}-major`,
      type: "line",
      source: sourceId,
      "source-layer": "depth_contours",
      filter: ["all", major, ["!", safety]],
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": v.line, "line-width": size(0.16, 0.8), "line-opacity": opacity },
    },
    {
      id: `${sourceId}-safety`,
      type: "line",
      source: sourceId,
      "source-layer": "depth_contours",
      filter: safety,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": v.line, "line-width": size(0.26, 1.2), "line-opacity": opacity },
    },
  ];

  // Contour numbers; the minor ones only where their lines show.
  const contourLabels = (suffix, filter, minzoom) => ({
    id: `${sourceId}-contour-labels-${suffix}`,
    type: "symbol",
    source: sourceId,
    "source-layer": "depth_labels",
    ...(minzoom ? { minzoom } : {}),
    filter: ["all", ["==", ["get", "k"], "c"], inList(shown), filter],
    layout: {
      "text-field": ["to-string", ["get", "d"]],
      // Upright: the italic 1 reads as a 7 at print size.
      "text-font": FONT,
      "text-size": size(1.75, 10.5),
      "text-rotate": ["get", "a"],
      "text-rotation-alignment": "map",
      "text-pitch-alignment": "map",
      "text-padding": 6 * mm,
      "symbol-sort-key": ["-", 0, ["to-number", ["in", ["get", "d"], ["literal", v.safety]]]],
    },
    paint: {
      "text-color": v.labelColor,
      // The halo hides the line under the number, as the gap on a paper chart.
      "text-halo-color": "rgba(255,255,255,0.92)",
      "text-halo-width": size(0.35, 1.3),
      "text-opacity": opacity,
    },
  });

  const labels = [
    contourLabels("major", major),
    contourLabels("minor", ["!", major], z(v.minorMinZoom)),
    {
      id: `${sourceId}-shoals`,
      type: "symbol",
      source: sourceId,
      "source-layer": "depth_labels",
      minzoom: z(v.shoalMinZoom),
      filter: ["all", ["==", ["get", "k"], "s"], ["<", ["get", "d"], lastBand]],
      layout: {
        "text-field": soundingText(),
        "text-font": FONT,
        "text-size": size(1.6, 10),
        "text-padding": 1.5 * mm,
        "symbol-sort-key": ["get", "d"],
      },
      paint: { "text-color": "#2b3f55", "text-halo-color": "rgba(255,255,255,0.75)", "text-halo-width": size(0.2, 0.8), "text-opacity": opacity },
    },
    {
      id: `${sourceId}-soundings`,
      type: "symbol",
      source: sourceId,
      "source-layer": "depth_labels",
      minzoom: z(v.gridMinZoom),
      filter: ["==", ["get", "k"], "g"],
      layout: {
        "text-field": soundingText(),
        "text-font": FONT,
        "text-size": size(1.45, 9),
        "text-padding": 2.5 * mm,
        "symbol-sort-key": ["get", "d"],
      },
      paint: { "text-color": "#56697d", "text-halo-color": "rgba(255,255,255,0.6)", "text-halo-width": size(0.15, 0.6), "text-opacity": opacity },
    },
  ];
  // Sea (DDM, EMODnet) and lakes (NOVANA) go to different places in the base map.
  const split = (onlyLakes) =>
    under.map((l) => ({
      ...l,
      id: `${l.id}-${onlyLakes ? "lake" : "sea"}`,
      filter: ["all", [onlyLakes ? "==" : "!=", ["get", "src"], "novana"], ...(l.filter ? [l.filter] : [])],
    }));
  return { sea: split(false), lake: split(true), labels };
}

/**
 * Put the depth layers into a Dataforsyningen skærmkort style. Sea bands and
 * lines go right after the sea polygon (`vand_hav`), so the base map's land and
 * coastline are drawn on top and decide where the water ends (the model's own
 * coast is generalised to 1:100.000). Lake bands go after the base map's lake
 * fills. Labels go above all fills and roads, below the base map's place names,
 * so names win collisions.
 */
export function withDepth(baseStyle, sourceId, url, attribution, opts) {
  const style = structuredClone(baseStyle);
  style.sources[sourceId] = { type: "vector", url, attribution };
  const { sea, lake, labels } = depthLayers(sourceId, opts);
  const layers = style.layers;
  const lastIndex = (pred) => layers.reduce((last, l, i) => (pred(l) ? i : last), -1);
  layers.splice(lastIndex((l) => l.id.startsWith("vand_sø")) + 1, 0, ...lake);
  layers.splice(layers.findIndex((l) => l.id === "vand_hav") + 1, 0, ...sea);
  layers.splice(lastIndex((l) => l.type !== "symbol") + 1, 0, ...labels);
  return style;
}
