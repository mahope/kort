import type { ExpressionSpecification, GeoJSONSourceSpecification, LayerSpecification } from "maplibre-gl";

/**
 * Lake depths, historical lake charts and wrecks: small GeoJSON snapshots in
 * public/data/soekort, built by scripts/soekort/build-soekort-data.mjs. They are
 * served by the app itself, so they need no token and look the same on every print.
 *
 * Only type imports from maplibre-gl here: sources.ts (and so /kilder) imports this.
 */
export type VectorOverlayKind = "soedybder" | "indsoekort" | "vrag";

const SOEKORT_DATA_PATH = "/data/soekort";

/** Same-origin path of a snapshot. */
export function soekortDataUrl(kind: VectorOverlayKind): string {
  return `${SOEKORT_DATA_PATH}/${kind}.geojson`;
}

/** MapLibre loads GeoJSON in a worker with a blob: base URL, so give it an absolute URL. */
export function vectorOverlaySource(kind: VectorOverlayKind): GeoJSONSourceSpecification {
  const path = soekortDataUrl(kind);
  const data = typeof window === "undefined" ? path : new URL(path, window.location.origin).href;
  return { type: "geojson", data };
}

/** CSS pixels per millimetre on screen (96 dpi), as in contours.ts. */
const SCREEN_PX_PER_MM = 96 / 25.4;

const LAKE_BLUE = "#1d5fa8";
const WRECK_INK = "#1f1f1f";
const CHART_PURPLE = "#6b3fa0";
const HALO = "rgba(255,255,255,0.9)";
const FONT = ["Open Sans Regular"];

/** Lake depth contours: a line per whole metre, every 5 m bolder, depth numbers on the lines. */
function lakeDepthLayers(sourceId: string, opacity: number, mm: number): LayerSpecification[] {
  const everyFive: ExpressionSpecification = ["==", ["%", ["get", "d"], 5], 0];
  return [
    {
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": LAKE_BLUE,
        "line-width": ["case", everyFive, 0.26 * mm, 0.13 * mm],
        "line-opacity": opacity,
      },
    },
    {
      id: `${sourceId}-label`,
      type: "symbol",
      source: sourceId,
      // Zoom 13 is about 1:25.000 in a 150 dpi PDF; the lakes are small.
      minzoom: 13,
      layout: {
        "symbol-placement": "line",
        "text-field": ["to-string", ["get", "d"]],
        "text-font": FONT,
        "text-size": 1.9 * mm,
        "symbol-spacing": 60 * mm,
        "text-keep-upright": true,
      },
      paint: { "text-color": LAKE_BLUE, "text-halo-color": HALO, "text-halo-width": 0.35 * mm, "text-opacity": opacity },
    },
  ];
}

/** Wrecks: a small ringed dot, with the ship's name (and year sunk) where known. */
function wreckLayers(sourceId: string, opacity: number, mm: number): LayerSpecification[] {
  return [
    {
      id: `${sourceId}-point`,
      type: "circle",
      source: sourceId,
      minzoom: 9,
      paint: {
        "circle-radius": 0.7 * mm,
        "circle-color": "#ffffff",
        "circle-stroke-color": WRECK_INK,
        "circle-stroke-width": 0.35 * mm,
        "circle-opacity": opacity,
        "circle-stroke-opacity": opacity,
      },
    },
    {
      id: `${sourceId}-label`,
      type: "symbol",
      source: sourceId,
      minzoom: 11,
      filter: ["has", "n"],
      layout: {
        "text-field": [
          "concat",
          ["get", "n"],
          ["case", ["has", "y"], ["concat", " (", ["to-string", ["get", "y"]], ")"], ""],
        ],
        "text-font": FONT,
        "text-size": 1.8 * mm,
        "text-anchor": "left",
        "text-offset": [0.7, 0],
        "text-optional": true,
      },
      paint: { "text-color": WRECK_INK, "text-halo-color": HALO, "text-halo-width": 0.3 * mm, "text-opacity": opacity },
    },
  ];
}

/** Historical lake charts: a marker on the lake with "Indsøkort <year>" under the name. */
function lakeChartLayers(sourceId: string, opacity: number, mm: number): LayerSpecification[] {
  return [
    {
      id: `${sourceId}-point`,
      type: "circle",
      source: sourceId,
      paint: {
        "circle-radius": 1.1 * mm,
        "circle-color": CHART_PURPLE,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 0.3 * mm,
        "circle-opacity": opacity,
        "circle-stroke-opacity": opacity,
      },
    },
    {
      id: `${sourceId}-label`,
      type: "symbol",
      source: sourceId,
      minzoom: 9,
      layout: {
        "text-field": [
          "concat",
          ["get", "t"],
          "\nHistorisk indsøkort",
          ["case", ["has", "y"], ["concat", " ", ["to-string", ["get", "y"]]], ""],
        ],
        "text-font": FONT,
        "text-size": 1.9 * mm,
        "text-anchor": "top",
        "text-offset": [0, 0.8],
        "text-optional": true,
      },
      paint: { "text-color": CHART_PURPLE, "text-halo-color": HALO, "text-halo-width": 0.35 * mm, "text-opacity": opacity },
    },
  ];
}

/**
 * Layers for one vector overlay. Sizes are millimetres on paper converted with
 * `pxPerMm`, so a 300 dpi PDF gets the same weights as the screen.
 */
export function vectorOverlayLayers(
  kind: VectorOverlayKind,
  sourceId: string,
  opacity: number,
  pxPerMm: number = SCREEN_PX_PER_MM
): LayerSpecification[] {
  switch (kind) {
    case "soedybder":
      return lakeDepthLayers(sourceId, opacity, pxPerMm);
    case "vrag":
      return wreckLayers(sourceId, opacity, pxPerMm);
    case "indsoekort":
      return lakeChartLayers(sourceId, opacity, pxPerMm);
  }
}
