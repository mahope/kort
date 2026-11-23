import type { BaseLayer, MapStyle, OverlayId } from "@/types/map";
import { isGridSystem, type GridSystem } from "@/lib/geo/coordinates";
import type { PaperFormat, Orientation, DpiOption } from "@/types/print";
import { MAP_BOUNDS } from "@/lib/map/styles";
import { MIN_CUSTOM_SCALE, MAX_CUSTOM_SCALE } from "@/constants/scales";
import { isGridSpacing, type GridSpacing, type GridLabelFormat, type UtmZoneMode } from "@/lib/geo/utmGrid";
import { mapRegionAt } from "@/lib/geo/regions";
import { REPLACED_BY_SOEKORT } from "@/lib/map/sources";
import type { SoekortVariant } from "@/lib/map/soekortStyle";

interface UrlOverlay {
  id: OverlayId;
  /** Absent: the layer's default opacity (a hand-written link like `ov=dd,hb`). */
  opacity?: number;
}

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
  overlays?: UrlOverlay[];
  showUtmGrid?: boolean;
  gridSystem?: GridSystem;
  /** Grid options — only serialized while the grid is on. */
  gridSpacing?: GridSpacing;
  showGridLabels?: boolean;
  gridLabelFormat?: GridLabelFormat;
  utmZoneMode?: UtmZoneMode;
  multiPage?: boolean;
  gridCols?: number;
  gridRows?: number;
  /** Only serialized when not the default (klassisk). */
  soekortVariant?: SoekortVariant;
}

const OVERLAY_CODES: Record<string, OverlayId> = {
  co: "contours",
  c2: "contours25",
  k5: "kurver5",
  kt: "kurver10",
  hs: "hillshade",
  sn: "stednavne",
  mk: "matrikel",
  dd: "dybdemodel",
  hb: "havbund",
  hd: "havdybder", // old links: opens soekort (see REPLACED_BY_SOEKORT)
  sm: "soemaerker",
  kn: "kurverNorge",
  sd: "soedybder",
  ik: "indsoekort",
  vr: "vrag",
  sk: "soekort",
  // EMODnet chosen on its own since soekort came; written instead of `hd`, so the link does not turn soekort on.
  he: "havdybder",
};

/** Variant codes (`sv=`); the default, klassisk, is left out of links. */
const SOEKORT_VARIANT_CODES: Record<string, SoekortVariant> = { kl: "klassisk", lv: "lavvande" };

const OVERLAY_TO_CODE = Object.fromEntries(
  Object.entries(OVERLAY_CODES).map(([k, v]) => [v, k])
) as Record<OverlayId, string>;

const BASE_LAYER_CODES: Record<string, BaseLayer> = {
  n: "none",
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
  if (state.gridSystem) params.set("cs", state.gridSystem);

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
  if (state.overlays && state.overlays.length > 0) {
    params.set(
      "ov",
      state.overlays
        .map((o) => (o.opacity === undefined ? OVERLAY_TO_CODE[o.id] : `${OVERLAY_TO_CODE[o.id]}-${Math.round(o.opacity * 100)}`))
        .join(",")
    );
  }
  if (state.soekortVariant && state.soekortVariant !== "klassisk" && state.overlays?.some((o) => o.id === "soekort")) {
    params.set("sv", Object.keys(SOEKORT_VARIANT_CODES).find((k) => SOEKORT_VARIANT_CODES[k] === state.soekortVariant)!);
  }
  if (state.showUtmGrid) {
    params.set("g", "1");
    // Defaults (auto / labels on / short / dk) are left out to keep links short.
    if (state.gridSpacing && state.gridSpacing !== "auto") params.set("gs", String(state.gridSpacing));
    if (state.showGridLabels === false) params.set("gl", "0");
    if (state.gridLabelFormat === "full") params.set("gf", "f");
    if (state.utmZoneMode === "std") params.set("gz", "s");
  }
  if (state.multiPage) {
    params.set("mp", "1");
    if (state.gridCols) params.set("gc", String(state.gridCols));
    if (state.gridRows) params.set("gr", String(state.gridRows));
  }

  return params.toString();
}

const MAX_ZOOM = 22;

/** Parses a plain finite number; rejects "", "Infinity", "NaN" and junk. */
function parseFinite(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Wraps any finite angle into [-180, 180]; values already inside are kept. */
function normalizeBearing(deg: number): number {
  if (deg >= -180 && deg <= 180) return deg;
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** A code's value, own keys only: `constructor` or `toString` in a link must not resolve to Object's. */
function lookup<T>(codes: Record<string, T>, code: string): T | undefined {
  return Object.hasOwn(codes, code) ? codes[code] : undefined;
}

export function deserializeState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const state: UrlState = {};
  const cs = params.get("cs");
  if (cs && isGridSystem(cs)) state.gridSystem = cs;
  else if (params.get("g") === "1") state.gridSystem = "utm";

  const c = params.get("c");
  if (c) {
    const parts = c.split(",").map(parseFinite);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => n !== undefined)) {
      const [lat, lng, zoom] = parts as number[];
      const [[west, south], [east, north]] = MAP_BOUNDS;
      // Out-of-range views are dropped as a whole; the URL is rewritten from the stores.
      if (lat >= south && lat <= north && lng >= west && lng <= east && zoom >= 0 && zoom <= MAX_ZOOM) {
        state.lat = lat;
        state.lng = lng;
        state.zoom = zoom;
      }
    }
  }

  const b = params.get("b");
  if (b) {
    const bearing = parseFinite(b);
    if (bearing !== undefined) state.bearing = normalizeBearing(bearing);
  }

  const l = params.get("l");
  if (l) {
    // Accept a short code (sk, of, ...) or a full value; ignore anything else
    // so a manipulated URL can't inject an unknown layer id into the store.
    if (lookup(BASE_LAYER_CODES, l)) {
      state.baseLayer = BASE_LAYER_CODES[l];
    } else if ((Object.values(BASE_LAYER_CODES) as string[]).includes(l)) {
      state.baseLayer = l as BaseLayer;
    }
  }

  const v = params.get("v");
  if (v) {
    if (lookup(STYLE_CODES, v)) {
      state.style = STYLE_CODES[v];
    } else if ((Object.values(STYLE_CODES) as string[]).includes(v)) {
      state.style = v as MapStyle;
    }
  }

  const s = params.get("s");
  if (s) {
    // Same interval the custom-scale input in the sidebar accepts.
    const scale = parseFinite(s);
    if (scale !== undefined && scale >= MIN_CUSTOM_SCALE && scale <= MAX_CUSTOM_SCALE) state.scale = scale;
  }

  const f = params.get("f");
  if (f && ["A5", "A4", "A3", "A2", "A1", "A0"].includes(f)) {
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

  const ov = params.get("ov");
  if (ov) {
    const overlays: UrlOverlay[] = [];
    for (const token of ov.split(",")) {
      const [code, pct] = token.split("-");
      const id = lookup(OVERLAY_CODES, code);
      if (!id) continue;
      if (REPLACED_BY_SOEKORT.includes(id) && code !== "he") {
        // Old links to the depth layers open our own søkort, at its own opacity
        // (the old numbers were for semi-transparent rasters).
        if (!overlays.some((o) => o.id === "soekort")) overlays.push({ id: "soekort" });
        // Outside Denmark EMODnet still shows what soekort.pmtiles lacks (north of 59° N).
        const nordic = state.lat !== undefined && state.lng !== undefined && mapRegionAt(state.lng, state.lat) === "nordic";
        if (id !== "havdybder" || !nordic) continue;
      }
      const parsed = pct ? Number(pct) : NaN;
      overlays.push(isNaN(parsed) ? { id } : { id, opacity: Math.min(1, Math.max(0, parsed / 100)) });
    }
    // A link with both an old code and the new one: keep one soekort, the one with an opacity if any.
    const unique = overlays.filter((o) => {
      const same = overlays.filter((p) => p.id === o.id);
      return same.length === 1 || o === (same.find((p) => p.opacity !== undefined) ?? same[0]);
    });
    if (unique.length > 0) state.overlays = unique;
  }

  const sv = params.get("sv");
  const variant = sv ? lookup(SOEKORT_VARIANT_CODES, sv) : undefined;
  if (variant) state.soekortVariant = variant;

  if (params.get("g") === "1") state.showUtmGrid = true;
  const gs = params.get("gs");
  if (gs !== null) {
    const n = Number(gs);
    if (isGridSpacing(n)) state.gridSpacing = n;
    else if (gs === "a") state.gridSpacing = "auto";
  }
  if (params.get("gl") === "0") state.showGridLabels = false;
  if (params.get("gf") === "f") state.gridLabelFormat = "full";
  if (params.get("gz") === "s") state.utmZoneMode = "std";

  if (params.get("mp") === "1") {
    state.multiPage = true;
    const gc = Number(params.get("gc"));
    if (gc >= 1 && gc <= 6) state.gridCols = gc;
    const gr = Number(params.get("gr"));
    if (gr >= 1 && gr <= 6) state.gridRows = gr;
  }

  return state;
}
