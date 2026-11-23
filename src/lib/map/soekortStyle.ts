import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";

/**
 * Layers for our own depth tiles, soekort.pmtiles (depth_areas, depth_contours,
 * depth_labels), built by scripts/soekort/ddm-pmtiles from Danmarks Dybdemodel,
 * EMODnet and the NOVANA lake surveys. Every feature carries `src` (ddm,
 * emodnet, novana). A port of scripts/soekort/ddm-pmtiles/preview/style.mjs
 * with the two variants the app offers.
 *
 * Sizes are millimetres on paper converted with pxPerMm (as in contours.ts), so
 * a 300 dpi PDF gets the same weights as the screen. Zoom thresholds are given
 * for the screen (96 dpi) and shifted by the same factor: 1:25.000 is zoom 12.7
 * on screen and 14.3 in a 300 dpi PDF, and both show the same things.
 *
 * The PDF loads tiles 1.6 zoom levels deeper than the screen at the same scale,
 * so it gets a finer data tier (1 m and 3 m bands, soundings). Every layer is
 * therefore split per data tier, with the tier's screen zoom range shifted like
 * the other thresholds, and shows only what that tier holds on screen.
 *
 * Only type imports from maplibre-gl here, as in vectorOverlays.ts.
 */

const SCREEN_PX_PER_MM = 96 / 25.4;
const FONT = ["Open Sans Regular"];

export const SOEKORT_URL =
  process.env.NEXT_PUBLIC_SOEKORT_URL || "https://tiles.mahoje.dk/soekort.pmtiles";

/** The `src` values the build writes (build.py). */
export type SoekortSrc = "ddm" | "emodnet" | "novana";
export const SOEKORT_SRCS: readonly SoekortSrc[] = ["ddm", "emodnet", "novana"];

interface DataTier {
  from: number;
  ddm: number[];
  emodnet: number[];
  lakes: boolean;
  soundings: boolean;
}

/**
 * What each zoom tier of soekort.pmtiles holds (TIERS and EMOD_LEVELS in
 * build.py). `from` is the first tile zoom; on screen (512 px tiles, pixel
 * ratio 1) the tile zoom is the screen zoom rounded down.
 */
export const DATA_TIERS: readonly DataTier[] = [
  { from: 5, ddm: [2, 5, 10, 20, 50, 100, 200], emodnet: [10, 20, 50, 100, 200], lakes: false, soundings: false },
  { from: 9, ddm: [2, 5, 10, 20, 30, 50, 100, 200], emodnet: [5, 10, 20, 50, 100, 200], lakes: true, soundings: false },
  { from: 12, ddm: [1, 2, 3, 4, 5, 10, 15, 20, 30, 50, 100, 200], emodnet: [5, 10, 20, 50, 100, 200], lakes: true, soundings: true },
];
// NOVANA lake data is the same in every tier that has lakes.
const LAKE_LEVELS = [1, 2, 3, 4, 5, 10, 15, 20, 30, 50, 100, 200];

export type SoekortVariant = "klassisk" | "lavvande";

interface VariantStyle {
  /** [from-depth, colour]; the first entry is from 0 m. */
  bands: [number, string][];
  line: string;
  /** Contours drawn heavier. */
  major: number[];
  /** The heaviest contours. */
  safety: number[];
  /** Screen zoom from which the in-between lines (1, 3, 15, 30 m) show. */
  minorMinZoom: number;
  labelColor: string;
  /** Screen zooms from which shoal soundings and the regular grid of soundings show. */
  shoalMinZoom: number;
  gridMinZoom: number;
}

export const SOEKORT_VARIANTS: Record<SoekortVariant, VariantStyle> = {
  // Paper-chart look: five tints, shallow water darkest, deep water nearly white.
  klassisk: {
    bands: [[0, "#8fc1e6"], [2, "#aed2ee"], [5, "#cce3f5"], [10, "#e3f0fa"], [20, "#f5f9fd"]],
    line: "#4f7fae",
    major: [2, 5, 10, 20, 50, 100, 200],
    safety: [2, 5],
    minorMinZoom: 12,
    labelColor: "#2d5d8c",
    shoalMinZoom: 11.5,
    gridMinZoom: 13.5,
  },
  // Kayak, canoe and dinghy: the first five metres metre by metre, every line numbered.
  lavvande: {
    bands: [[0, "#7fb6e0"], [1, "#96c4e8"], [2, "#add3ee"], [3, "#c2def3"], [4, "#d4e8f7"], [5, "#e5f1fa"], [10, "#f6fafd"]],
    line: "#4f7fae",
    major: [1, 2, 3, 4, 5, 10, 20, 50],
    safety: [1, 2, 3],
    minorMinZoom: 11,
    labelColor: "#2d5d8c",
    shoalMinZoom: 11,
    gridMinZoom: 12.5,
  },
};

/** Labels for the sidebar; the default comes first. */
export const SOEKORT_VARIANT_LABELS: Record<SoekortVariant, string> = {
  klassisk: "Klassisk søkort",
  lavvande: "Lavt vand",
};

export const DEFAULT_SOEKORT_VARIANT: SoekortVariant = "klassisk";

// Plain objects while the layers are assembled; cast to LayerSpecification at the end.
type Layer = Record<string, unknown> & {
  id: string;
  type: "fill" | "line" | "symbol";
  minzoom?: number;
  maxzoom?: number;
  filter?: unknown;
  paint: Record<string, unknown>;
};

const inList = (values: number[]): ExpressionSpecification => ["in", ["get", "d"], ["literal", values]];

/** Depth number: whole metres, and below 10 m the decimal in a smaller size (as on charts). */
function soundingText(): ExpressionSpecification {
  const d: ExpressionSpecification = ["get", "d"];
  const whole: ExpressionSpecification = ["floor", d];
  const tenth: ExpressionSpecification = ["round", ["*", ["-", d, whole], 10]];
  return [
    "case",
    ["all", ["<", d, 10], [">", tenth, 0]],
    ["format", ["to-string", whole], {}, ["to-string", tenth], { "font-scale": 0.72 }],
    ["format", ["to-string", whole], {}],
  ];
}

export interface SoekortLayerOptions {
  variant?: SoekortVariant;
  pxPerMm?: number;
  opacity?: number;
  /**
   * Draw the depth bands. They reach 1 km past the model's coast, under the
   * skærmkort's land; a raster base map has no land on top, so there only the
   * contours and numbers are drawn (until the build clips the bands to the coast).
   */
  bands?: boolean;
}

/**
 * The layers in three groups, so a caller can put them at the right place in a
 * base map: `sea` (DDM and EMODnet bands and lines, below the base map's land),
 * `lake` (NOVANA, above the base map's lake fills) and `labels` (above the
 * land, below the base map's own place names).
 */
export function soekortLayers(
  sourceId: string,
  { variant = DEFAULT_SOEKORT_VARIANT, pxPerMm = SCREEN_PX_PER_MM, opacity = 1, bands = true }: SoekortLayerOptions = {}
): { sea: LayerSpecification[]; lake: LayerSpecification[]; labels: LayerSpecification[] } {
  const v = SOEKORT_VARIANTS[variant];
  const mm = pxPerMm;
  // Millimetres on paper, but never below a readable pixel size on screen
  // (1.75 mm is only 6.6 px at 96 dpi; at 300 dpi it is 20.7 px and the floor never applies).
  const size = (millimetres: number, minPx: number) => Math.max(millimetres * mm, minPx);
  const z = (screenZoom: number) => screenZoom + Math.log2(pxPerMm / SCREEN_PX_PER_MM);
  // Only the bands whose upper depths are levels of the tier; finer bands take the colour of the band around them.
  const bandFill = (levels: number[]): ExpressionSpecification | string => {
    const shownBands = v.bands.filter(([from], i) => i === 0 || levels.includes(from));
    return shownBands.length > 1
      ? (["step", ["get", "d0"], shownBands[0][1], ...shownBands.slice(1).flat()] as ExpressionSpecification)
      : shownBands[0][1];
  };
  const fill = bandFill(LAKE_LEVELS);
  const lastBand = v.bands[v.bands.length - 1][0];
  const major = inList(v.major);
  const safety = inList(v.safety);
  const shown = [...new Set([...v.major, 1, 2, 3, 5, 10, 15, 20, 30, 50, 100, 200])];

  const under: Layer[] = [
    ...(bands
      ? [
          {
            id: `${sourceId}-areas`,
            type: "fill" as const,
            source: sourceId,
            "source-layer": "depth_areas",
            // Deeper than the last band shares its colour; no polygon edges inside.
            paint: { "fill-color": fill, "fill-opacity": opacity, "fill-antialias": false },
          },
        ]
      : []),
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
  const contourLabels = (suffix: string, filter: unknown, minzoom?: number): Layer => ({
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

  const labels: Layer[] = [
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
      paint: {
        "text-color": "#2b3f55",
        "text-halo-color": "rgba(255,255,255,0.75)",
        "text-halo-width": size(0.2, 0.8),
        "text-opacity": opacity,
      },
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
      paint: {
        "text-color": "#56697d",
        "text-halo-color": "rgba(255,255,255,0.6)",
        "text-halo-width": size(0.15, 0.6),
        "text-opacity": opacity,
      },
    },
  ];

  // Sea (DDM, EMODnet) and lakes (NOVANA) go to different places in the base map.
  const split = (onlyLakes: boolean): Layer[] =>
    under.map((l) => ({
      ...l,
      id: `${l.id}-${onlyLakes ? "lake" : "sea"}`,
      filter: ["all", [onlyLakes ? "==" : "!=", ["get", "src"], "novana"], ...(l.filter ? [l.filter] : [])],
    }));

  // One copy per data tier, active over the tier's screen zoom range (shifted
  // for print), showing only the levels the tier has: a PDF that loads a finer
  // tier then shows what the screen shows at the same scale.
  const perTier = (layer: Layer): Layer[] =>
    DATA_TIERS.flatMap((t, i) => {
      const next = DATA_TIERS[i + 1];
      const minzoom = Math.max(layer.minzoom ?? -Infinity, i ? z(t.from) : -Infinity);
      const maxzoom = next ? z(next.from) : Infinity;
      const sounding = layer.type === "symbol" && !layer.id.includes("contour-labels");
      if (minzoom >= maxzoom || (sounding && !t.soundings)) return [];
      const src = (lakes: unknown, emodnet: unknown, ddm: unknown) => ["match", ["get", "src"], "novana", lakes, "emodnet", emodnet, ddm];
      const copy: Layer = { ...layer, id: `${layer.id}-z${t.from}` };
      delete copy.minzoom;
      if (minzoom > -Infinity) copy.minzoom = minzoom;
      if (maxzoom < Infinity) copy.maxzoom = maxzoom;
      if (layer.type === "fill") {
        copy.filter = ["all", src(t.lakes, true, true), layer.filter];
        copy.paint = { ...layer.paint, "fill-color": src(fill, bandFill(t.emodnet), bandFill(t.ddm)) };
      } else if (!sounding) {
        copy.filter = ["all", src(t.lakes, inList(t.emodnet), inList(t.ddm)), layer.filter];
      }
      return [copy];
    });

  const out = (layers: Layer[]) => layers.flatMap(perTier) as unknown as LayerSpecification[];
  return { sea: out(split(false)), lake: out(split(true)), labels: out(labels) };
}

/** Where the three groups go in the base map: the id of the layer each is inserted before. */
export interface SoekortAnchors {
  sea?: string;
  lake?: string;
  labels?: string;
}

/**
 * The insertion points in a Dataforsyningen skærmkort style, or null for any
 * other base map (raster, blank). Sea bands and lines go right after the sea
 * polygon (`vand_hav`), so the base map's land and coastline are drawn on top
 * and decide where the water ends (the model's own coast is generalised to
 * 1:100.000). Lake layers go after the last lake fill (`vand_sø*`). Labels go
 * above all fills and roads, below the base map's place names, so names win
 * collisions.
 *
 * `base` is the base map's own layers only, without those the app added on
 * top (on screen: baseLayersOf in SoekortLayers.tsx; the PDF reads them first).
 */
export function soekortAnchors(base: readonly { id: string; type: string }[]): SoekortAnchors | null {
  const sea = base.findIndex((l) => l.id === "vand_hav");
  if (sea < 0) return null;
  const lastIndex = (pred: (l: { id: string; type: string }) => boolean) =>
    base.reduce((last, l, i) => (pred(l) ? i : last), -1);
  const lake = lastIndex((l) => l.id.startsWith("vand_sø"));
  const lastFill = lastIndex((l) => l.type !== "symbol");
  return {
    sea: base[sea + 1]?.id,
    lake: lake >= 0 ? base[lake + 1]?.id : base[sea + 1]?.id,
    labels: base[lastFill + 1]?.id,
  };
}

/** The layers with the id of the base-map layer each goes before (none without anchors). */
export function soekortLayersWithAnchors(
  sourceId: string,
  anchors: SoekortAnchors | null,
  opts: Omit<SoekortLayerOptions, "bands"> = {}
): { layer: LayerSpecification; beforeId?: string }[] {
  const { sea, lake, labels } = soekortLayers(sourceId, { ...opts, bands: anchors !== null });
  const before = (group: LayerSpecification[], id?: string) => group.map((layer) => ({ layer, beforeId: id }));
  return [...before(sea, anchors?.sea), ...before(lake, anchors?.lake), ...before(labels, anchors?.labels)];
}
