"use client";

import { useMapStore } from "@/stores/mapStore";
import { mapRegionAt, type MapRegion } from "@/lib/geo/regions";

/** Danish or Nordic sources, from the map centre (where the print frame sits). */
export function useMapRegion(): MapRegion {
  return useMapStore((s) => mapRegionAt(s.viewState.longitude, s.viewState.latitude));
}
