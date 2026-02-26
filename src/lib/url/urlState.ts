import type { BaseLayer, MapStyle } from "@/types/map";
import type { PaperFormat, Orientation, DpiOption } from "@/types/print";

interface UrlState {
  lng?: number;
  lat?: number;
  zoom?: number;
  bearing?: number;
  baseLayer?: BaseLayer;
  style?: MapStyle;
  scale?: number;
  paperFormat?: PaperFormat;
  orientation?: Orientation;
  dpi?: DpiOption;
}

const BASE_LAYER_CODES: Record<string, BaseLayer> = {
  sk: "skaermkort",
  of: "ortofoto",
  osm: "osm",
  dtk: "dtk25",
  hh: "historisk_hoeje",
  hl: "historisk_lave",
};

const BASE_LAYER_TO_CODE: Record<BaseLayer, string> = Object.fromEntries(
  Object.entries(BASE_LAYER_CODES).map(([k, v]) => [v, k])
) as Record<BaseLayer, string>;

const STYLE_CODES: Record<string, MapStyle> = {
  kl: "klassisk",
  da: "daempet",
  gr: "graa",
  mo: "moerkt",
};

const STYLE_TO_CODE: Record<MapStyle, string> = Object.fromEntries(
  Object.entries(STYLE_CODES).map(([k, v]) => [v, k])
) as Record<MapStyle, string>;

export function serializeState(state: UrlState): string {
  const params = new URLSearchParams();

  if (state.lng !== undefined && state.lat !== undefined && state.zoom !== undefined) {
    params.set("c", `${state.lat.toFixed(5)},${state.lng.toFixed(5)},${state.zoom.toFixed(1)}`);
  }
  if (state.bearing !== undefined && state.bearing !== 0) {
    params.set("b", String(Math.round(state.bearing)));
  }
  if (state.baseLayer) {
    params.set("l", BASE_LAYER_TO_CODE[state.baseLayer] || state.baseLayer);
  }
  if (state.style) {
    params.set("v", STYLE_TO_CODE[state.style] || state.style);
  }
  if (state.scale) {
    params.set("s", String(state.scale));
  }
  if (state.paperFormat) {
    params.set("f", state.paperFormat);
  }
  if (state.orientation) {
    params.set("o", state.orientation === "portrait" ? "p" : "l");
  }
  if (state.dpi) {
    params.set("d", String(state.dpi));
  }

  return params.toString();
}

export function deserializeState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const state: UrlState = {};

  const c = params.get("c");
  if (c) {
    const parts = c.split(",").map(Number);
    if (parts.length >= 3 && parts.every((n) => !isNaN(n))) {
      state.lat = parts[0];
      state.lng = parts[1];
      state.zoom = parts[2];
    }
  }

  const b = params.get("b");
  if (b) {
    const bearing = Number(b);
    if (!isNaN(bearing)) state.bearing = bearing;
  }

  const l = params.get("l");
  if (l) {
    state.baseLayer = BASE_LAYER_CODES[l] || (l as BaseLayer);
  }

  const v = params.get("v");
  if (v) {
    state.style = STYLE_CODES[v] || (v as MapStyle);
  }

  const s = params.get("s");
  if (s) {
    const scale = Number(s);
    if (!isNaN(scale) && scale > 0) state.scale = scale;
  }

  const f = params.get("f");
  if (f && ["A5", "A4", "A3", "A2"].includes(f)) {
    state.paperFormat = f as PaperFormat;
  }

  const o = params.get("o");
  if (o === "p") state.orientation = "portrait";
  else if (o === "l") state.orientation = "landscape";

  const d = params.get("d");
  if (d) {
    const dpi = Number(d);
    if ([150, 200, 300].includes(dpi)) state.dpi = dpi as DpiOption;
  }

  return state;
}
