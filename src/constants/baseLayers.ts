import type { BaseLayer } from "@/types/map";

/**
 * Single source of truth for the selectable base maps, shared by the sidebar
 * LayerSelector and the on-map MapControls so the two never drift apart
 * (previously MapControls was missing DTK25 — the default layer — leaving no
 * radio selected when the app loaded).
 */
export interface BaseLayerOption {
  value: BaseLayer;
  label: string;
  /** True for "skaermkort", which exposes an extra vector style picker. */
  hasStyles?: boolean;
}

export const BASE_LAYERS: BaseLayerOption[] = [
  { value: "skaermkort", label: "Skærmkort", hasStyles: true },
  { value: "dtk25", label: "Topografisk kort 1:25.000" },
  { value: "ortofoto", label: "Ortofoto (luftfoto)" },
  { value: "osm", label: "OpenStreetMap" },
  { value: "historisk_hoeje", label: "Høje Målebordsblade (1842–1899)" },
  { value: "historisk_lave", label: "Lave Målebordsblade (1901–1971)" },
];
