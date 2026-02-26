import type { MapStyle } from "@/types/map";

// Dataforsyningen requires a token for tile API requests.
// This is a free public token - get your own at https://dataforsyningen.dk
export const DATAFORSYNINGEN_TOKEN =
  process.env.NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN || "fd44f26ab5701c01ca9f570e507fe9ab";

/**
 * MapLibre transformRequest: appends token to Dataforsyningen API requests.
 */
export function transformRequest(url: string): { url: string } {
  if (url.includes("api.dataforsyningen.dk")) {
    const sep = url.includes("?") ? "&" : "?";
    return { url: `${url}${sep}token=${DATAFORSYNINGEN_TOKEN}` };
  }
  return { url };
}

export const MAP_STYLES: Record<MapStyle, { url: string; label: string }> = {
  klassisk: {
    url: "https://cdn.dataforsyningen.dk/assets/vector_tiles_assets/latest/styles/official/3857_skaermkort_klassisk.json",
    label: "Klassisk",
  },
  daempet: {
    url: "https://cdn.dataforsyningen.dk/assets/vector_tiles_assets/latest/styles/official/3857_skaermkort_daempet.json",
    label: "Dæmpet",
  },
  graa: {
    url: "https://cdn.dataforsyningen.dk/assets/vector_tiles_assets/latest/styles/official/3857_skaermkort_graa.json",
    label: "Grå",
  },
  moerkt: {
    url: "https://cdn.dataforsyningen.dk/assets/vector_tiles_assets/latest/styles/official/3857_skaermkort_moerkt.json",
    label: "Mørkt",
  },
};

export const DEFAULT_STYLE: MapStyle = "klassisk";

export const DENMARK_CENTER: [number, number] = [10.4, 56.0];
export const DEFAULT_ZOOM = 7;

export const DENMARK_BOUNDS: [[number, number], [number, number]] = [
  [3.0, 54.0],
  [16.0, 58.5],
];
