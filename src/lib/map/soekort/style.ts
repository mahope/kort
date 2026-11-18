import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl";
import tokens from "./soekort-style.json";

/**
 * The vector sea chart ("Søkort" base map): our own PMTiles on tiles.mahoje.dk,
 * built by scripts/soekort-vektor/build-soekort-tiles.sh, drawn in a calm print
 * style. Colours and sizes come from soekort-style.json; sizes are millimetres on
 * paper, converted with `pxPerMm` so a 300 dpi PDF gets the same weights and text
 * sizes as the screen.
 *
 * Only type imports from maplibre-gl: sources.ts (and so /kilder) imports this.
 */
export const SOEKORT_URL =
  process.env.NEXT_PUBLIC_SOEKORT_URL || "https://tiles.mahoje.dk/soekort-v1.pmtiles";
export const SOEKORT_SOURCE_ID = "soekort";

const GLYPHS = "https://cdn.dataforsyningen.dk/assets/vector_tiles_assets/latest/glyphs/{fontstack}/{range}.pbf";
const SCREEN_PX_PER_MM = 96 / 25.4;

export const SOEKORT_TOKENS = tokens;
const C = tokens.colors;
const F = tokens.fonts;
const MM = tokens.mm;

/** Depth band keys (shallow edge in metres) from shallow to deep, as in the tiles' `d`. */
export const DEPTH_BANDS = Object.keys(C.depth)
  .map(Number)
  .sort((a, b) => a - b);

/** Icon names the style asks for; icons.ts draws them on demand. */
export const SOEKORT_ICONS = { wreck: "soekort-vrag", anchor: "soekort-anker", harbour: "soekort-havn" } as const;

function depthColor(): ExpressionSpecification {
  const stops: (number | string)[] = [];
  for (const d of DEPTH_BANDS) stops.push(d, C.depth[String(d) as keyof typeof C.depth]);
  return ["match", ["get", "d"], ...stops, C.deepWater] as unknown as ExpressionSpecification;
}

/** The style object for the "soekort" base map. */
export function buildSoekortStyle(pxPerMm: number = SCREEN_PX_PER_MM): StyleSpecification {
  const mm = (v: number) => +(v * pxPerMm).toFixed(3);
  const src = SOEKORT_SOURCE_ID;
  const halo = mm(MM.halo);
  const layers: LayerSpecification[] = [
    { id: "sk-background", type: "background", paint: { "background-color": C.deepWater } },
    {
      id: "sk-depth",
      type: "fill",
      source: src,
      "source-layer": "dybde",
      paint: { "fill-color": depthColor(), "fill-antialias": false },
    },
    {
      id: "sk-depth-contour",
      type: "line",
      source: src,
      "source-layer": "kurve",
      filter: ["<=", ["get", "d"], 20],
      layout: { "line-join": "round" },
      paint: { "line-color": C.depthContour, "line-width": mm(MM.depthContour), "line-opacity": 0.9 },
    },
    { id: "sk-land", type: "fill", source: src, "source-layer": "land", paint: { "fill-color": C.land } },
    { id: "sk-nature", type: "fill", source: src, "source-layer": "natur", paint: { "fill-color": C.nature } },
    { id: "sk-forest", type: "fill", source: src, "source-layer": "skov", paint: { "fill-color": C.forest } },
    { id: "sk-built", type: "fill", source: src, "source-layer": "by", paint: { "fill-color": C.builtUp } },
    { id: "sk-lake", type: "fill", source: src, "source-layer": "vand", paint: { "fill-color": C.lake } },
    {
      id: "sk-lake-contour",
      type: "line",
      source: src,
      "source-layer": "soe",
      minzoom: 11,
      layout: { "line-join": "round" },
      paint: {
        "line-color": C.lakeContour,
        "line-width": ["case", ["==", ["%", ["get", "d"], 5], 0], mm(MM.lakeContour * 2), mm(MM.lakeContour)],
        "line-opacity": 0.8,
      },
    },
    {
      id: "sk-stream",
      type: "line",
      source: src,
      "source-layer": "vandloeb",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": C.stream,
        "line-width": ["match", ["get", "k"], "river", mm(MM.river), mm(MM.stream)],
      },
    },
    // OSM coastlines run with the land on the left: a negative offset puts the
    // beach on the land side of the dark coast line.
    {
      id: "sk-beach",
      type: "line",
      source: src,
      "source-layer": "kyst",
      minzoom: 9,
      layout: { "line-join": "round" },
      paint: { "line-color": C.beach, "line-width": mm(MM.beach), "line-offset": -mm(MM.beach / 2) },
    },
    {
      id: "sk-coast",
      type: "line",
      source: src,
      "source-layer": "kyst",
      layout: { "line-join": "round" },
      paint: { "line-color": C.coast, "line-width": mm(MM.coast) },
    },
    {
      id: "sk-natura",
      type: "line",
      source: src,
      "source-layer": "natura",
      minzoom: 9,
      paint: {
        "line-color": C.natura,
        "line-width": mm(MM.natura),
        "line-dasharray": [4, 2.5],
        "line-opacity": 0.75,
      },
    },
    {
      id: "sk-fairway",
      type: "line",
      source: src,
      "source-layer": "rende",
      paint: { "line-color": C.fairway, "line-width": mm(MM.fairway), "line-dasharray": [5, 3] },
    },
    {
      id: "sk-depth-contour-label",
      type: "symbol",
      source: src,
      "source-layer": "kurve",
      minzoom: 11,
      filter: ["match", ["get", "d"], [2, 5, 10, 20], true, false],
      layout: {
        "symbol-placement": "line",
        "text-field": ["to-string", ["get", "d"]],
        "text-font": F.regular,
        "text-size": mm(MM.depthContourText),
        "symbol-spacing": mm(120),
        "text-keep-upright": true,
      },
      paint: { "text-color": C.depthContourText, "text-halo-color": C.halo, "text-halo-width": halo },
    },
    {
      id: "sk-lake-contour-label",
      type: "symbol",
      source: src,
      "source-layer": "soe",
      minzoom: 13,
      layout: {
        "symbol-placement": "line",
        "text-field": ["to-string", ["get", "d"]],
        "text-font": F.regular,
        "text-size": mm(MM.depthContourText),
        "symbol-spacing": mm(60),
        "text-keep-upright": true,
      },
      paint: { "text-color": C.lakeContour, "text-halo-color": C.halo, "text-halo-width": halo },
    },
    // Soundings: "17₄" is one label (Open Sans has the subscript digits), so
    // collision keeps whole numbers apart.
    {
      id: "sk-sounding",
      type: "symbol",
      source: src,
      "source-layer": "tal",
      layout: {
        "text-field": ["get", "t"],
        "text-font": F.regular,
        "text-size": mm(MM.soundingText),
        "text-padding": mm(1.2),
        "text-allow-overlap": false,
      },
      paint: { "text-color": C.sounding },
    },
    {
      id: "sk-wreck",
      type: "symbol",
      source: src,
      "source-layer": "vrag",
      minzoom: 9,
      layout: {
        "icon-image": SOEKORT_ICONS.wreck,
        "icon-allow-overlap": true,
        "text-field": ["case", ["has", "n"], ["upcase", ["get", "n"]], ""],
        "text-font": F.regular,
        "text-size": mm(MM.wreckText),
        "text-letter-spacing": 0.05,
        "text-anchor": "left",
        "text-offset": [1.4, 0],
        "text-optional": true,
      },
      paint: { "text-color": C.wreck, "text-halo-color": C.halo, "text-halo-width": halo },
    },
    {
      id: "sk-harbour",
      type: "symbol",
      source: src,
      "source-layer": "havn",
      layout: {
        "icon-image": ["match", ["get", "k"], "anker", SOEKORT_ICONS.anchor, SOEKORT_ICONS.harbour],
        "text-field": ["coalesce", ["get", "n"], ""],
        "text-font": F.regular,
        "text-size": mm(MM.harbourText),
        "text-anchor": "left",
        "text-offset": [1.3, 0],
        "text-optional": true,
      },
      paint: { "text-color": C.harbour, "text-halo-color": C.halo, "text-halo-width": halo },
    },
    {
      id: "sk-natura-label",
      type: "symbol",
      source: src,
      "source-layer": "naturanavn",
      minzoom: 9,
      layout: {
        "text-field": ["get", "n"],
        "text-font": F.italic,
        "text-size": mm(MM.naturaText),
        "text-max-width": 9,
        "text-optional": true,
      },
      paint: { "text-color": C.natura, "text-halo-color": C.halo, "text-halo-width": halo },
    },
    {
      id: "sk-water-label",
      type: "symbol",
      source: src,
      "source-layer": "vandnavn",
      layout: {
        "text-field": ["get", "n"],
        "text-font": F.italic,
        "text-size": ["match", ["get", "k"], "hav", mm(MM.seaText), mm(MM.waterText)],
        "text-letter-spacing": 0.08,
        "text-max-width": 8,
      },
      paint: { "text-color": C.waterText, "text-halo-color": C.halo, "text-halo-width": halo },
    },
    {
      id: "sk-island-label",
      type: "symbol",
      source: src,
      "source-layer": "oe",
      layout: { "text-field": ["get", "n"], "text-font": F.italic, "text-size": mm(MM.islandText) },
      paint: { "text-color": C.islandText, "text-halo-color": C.landHalo, "text-halo-width": halo },
    },
    {
      id: "sk-place-label",
      type: "symbol",
      source: src,
      "source-layer": "sted",
      layout: {
        "text-field": ["get", "n"],
        "text-font": ["match", ["get", "r"], 1, ["literal", F.bold], ["literal", F.regular]] as unknown as ExpressionSpecification,
        "text-size": ["match", ["get", "r"], 1, mm(MM.placeText[0]), 2, mm(MM.placeText[1]), mm(MM.placeText[2])],
        "symbol-sort-key": ["get", "r"],
      },
      paint: { "text-color": C.placeText, "text-halo-color": C.landHalo, "text-halo-width": halo },
    },
  ];
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: { [src]: { type: "vector", url: `pmtiles://${SOEKORT_URL}`, attribution: SOEKORT_ATTRIBUTION } },
    layers,
  };
}

/** Screen attribution for the base map (HTML). */
export const SOEKORT_ATTRIBUTION =
  "Søkort: dybder fra <a href='https://emodnet.ec.europa.eu/en/bathymetry'>EMODnet Bathymetry</a> (CC BY 4.0), " +
  "land, havne og render &copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>-bidragydere (ODbL), " +
  "Natura 2000 fra Miljøstyrelsen/Danmarks Miljøportal, vrag fra EMODnet (UKHO, OGL v3.0), sødybder fra NOVANA. " +
  "Må ikke bruges til navigation";

/** PDF credits for the base map, one per source. */
export const SOEKORT_CREDITS = [
  "Søkort bygget af kort.mahoje.dk. Dybder: EMODnet Bathymetry (CC BY 4.0), bearbejdet",
  "Land, havne, ankerpladser og render: OpenStreetMap-bidragydere (ODbL)",
  "Natura 2000: Miljøstyrelsen/Danmarks Miljøportal. Indeholder data, som benyttes i henhold til vilkår for brug af danske offentlige data",
  "Vrag: EMODnet Human Activities (CC BY 4.0), UK Hydrographic Office (OGL v3.0). Sødybder: Miljøstyrelsen (NOVANA)",
];
