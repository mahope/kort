"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMapStore } from "@/stores/mapStore";
import {
  getSoekortAvailability,
  subscribeSoekortAvailability,
  type SoekortAvailability,
} from "@/lib/map/soekort/availability";

/** Whether the Søkort tiles answer (see availability.ts); "pending" on the server and until the probe answers. */
export function useSoekortAvailability(): SoekortAvailability {
  return useSyncExternalStore(subscribeSoekortAvailability, getSoekortAvailability, () => "pending");
}

/**
 * Hides nothing itself: when the tiles are missing and "soekort" is the chosen
 * base map (remembered from an earlier visit or opened from a link), it falls
 * back to the default base map, so the map is never an empty blue sheet.
 */
export function useSoekortFallback(): void {
  const availability = useSoekortAvailability();
  const baseLayer = useMapStore((s) => s.baseLayer);
  const setBaseLayer = useMapStore((s) => s.setBaseLayer);
  useEffect(() => {
    if (availability === "no" && baseLayer === "soekort") setBaseLayer("dtk25");
  }, [availability, baseLayer, setBaseLayer]);
}
