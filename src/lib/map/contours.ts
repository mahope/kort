import * as maplibregl from "maplibre-gl";
import type { LayerSpecification, ExpressionSpecification } from "maplibre-gl";
import { Protocol } from "pmtiles";

/**
 * 5 and 10 m contour lines for all of Denmark, built by us from Klimadatastyrelsen's
 * terrain model (DHM, CC BY 4.0) and served as one PMTiles file from tiles.mahoje.dk.
 * The file holds every 5 m line with its height `h` (layer "kurver"); the 10 m
 * overlay filters it. Build script: scripts/contours/kurver-dk.sh.
 */
export const CONTOURS_URL =
  process.env.NEXT_PUBLIC_CONTOURS_URL || "https://tiles.mahoje.dk/kurver-5m.pmtiles";
export const CONTOURS_SOURCE_LAYER = "kurver";
export const CONTOURS_HOST = new URL(CONTOURS_URL).origin;

/** CSS pixels per millimetre on screen (96 dpi). */
export const SCREEN_PX_PER_MM = 96 / 25.4;

const COLOR = "#a15c2b";

let registered = false;
/** MapLibre reads pmtiles:// URLs through this protocol; register once per page. */
export function ensurePmtilesProtocol(): void {
  if (registered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  registered = true;
}

export function contourSourceUrl(): string {
  return `pmtiles://${CONTOURS_URL}`;
}

/** Every 5th line is an index contour: 25 m for the 5 m set, 50 m for the 10 m set. */
export function contourSteps(interval: 5 | 10): { interval: number; index: number } {
  return { interval, index: interval * 5 };
}

function everyMetres(step: number): ExpressionSpecification {
  return ["==", ["%", ["to-number", ["get", "h"]], step], 0];
}

/**
 * Line and label layers for one contour overlay. Widths and text sizes are given
 * in millimetres on paper and converted with `pxPerMm`, so a 300 dpi PDF gets the
 * same line weight as the screen instead of hairlines.
 */
export function contourLayers(
  sourceId: string,
  interval: 5 | 10,
  opacity: number,
  pxPerMm: number = SCREEN_PX_PER_MM
): LayerSpecification[] {
  const { index } = contourSteps(interval);
  const base = everyMetres(interval);
  const isIndex = everyMetres(index);
  return [
    {
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      "source-layer": CONTOURS_SOURCE_LAYER,
      filter: ["all", base, ["!", isIndex]],
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": COLOR, "line-width": 0.13 * pxPerMm, "line-opacity": opacity },
    },
    {
      id: `${sourceId}-index`,
      type: "line",
      source: sourceId,
      "source-layer": CONTOURS_SOURCE_LAYER,
      filter: isIndex,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": COLOR, "line-width": 0.26 * pxPerMm, "line-opacity": opacity },
    },
    {
      id: `${sourceId}-label`,
      type: "symbol",
      source: sourceId,
      "source-layer": CONTOURS_SOURCE_LAYER,
      filter: isIndex,
      minzoom: 13,
      layout: {
        "symbol-placement": "line",
        "text-field": ["to-string", ["get", "h"]],
        "text-font": ["Open Sans Regular"],
        "text-size": 2.1 * pxPerMm,
        "symbol-spacing": 90 * pxPerMm,
        "text-keep-upright": true,
      },
      paint: {
        "text-color": COLOR,
        "text-halo-color": "rgba(255,255,255,0.85)",
        "text-halo-width": 0.35 * pxPerMm,
        "text-opacity": opacity,
      },
    },
  ];
}
