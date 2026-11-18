import type { BaseLayer } from "@/types/map";
import type { MapRegion } from "@/lib/geo/regions";
import { usesNordicTopo } from "@/lib/map/sources";

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
  { value: "soekort", label: "Søkort (dybder, vrag og havne)" },
  { value: "historisk_hoeje", label: "Høje Målebordsblade (1842–1899)" },
  { value: "historisk_lave", label: "Lave Målebordsblade (1901–1971)" },
  { value: "none", label: "Intet basiskort" },
];

/**
 * Outside Denmark every Danish base map becomes the same Nordic topo map, so
 * the pickers offer it once, under this label, next to OpenStreetMap and
 * "Intet basiskort". Choosing it picks DTK25, which is also what the map
 * returns to in Denmark.
 */
export const NORDIC_TOPO_OPTION: BaseLayerOption = { value: "dtk25", label: "Topografisk kort (Kartverket / OpenTopoMap)" };

/**
 * The base maps a picker offers in this region. `soekort` = false leaves out
 * "Søkort" while its tiles are not (yet) reachable (lib/map/soekort/availability.ts).
 */
export function baseLayerOptions(region: MapRegion, soekort = true): BaseLayerOption[] {
  const all = soekort ? BASE_LAYERS : BASE_LAYERS.filter((l) => l.value !== "soekort");
  if (region !== "nordic") return all;
  return [NORDIC_TOPO_OPTION, ...all.filter((l) => !usesNordicTopo(l.value, region))];
}

/** Whether `option` is the chosen one: in the Nordic region, any Danish map counts as the topo map. */
export function isBaseLayerSelected(option: BaseLayerOption, baseLayer: BaseLayer, region: MapRegion): boolean {
  if (option === NORDIC_TOPO_OPTION) return usesNordicTopo(baseLayer, region);
  return option.value === baseLayer;
}

/** Label of the map actually shown for `baseLayer` in this region. */
export function baseLayerLabel(baseLayer: BaseLayer, region: MapRegion): string {
  if (usesNordicTopo(baseLayer, region)) return NORDIC_TOPO_OPTION.label;
  return BASE_LAYERS.find((l) => l.value === baseLayer)?.label ?? baseLayer;
}
