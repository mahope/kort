"use client";

import { useMapStore } from "@/stores/mapStore";
import { SEA_OVERLAYS } from "@/lib/map/sources";

/** Shown while a sea layer is on: what the data is, and that it is not a chart. */
export function SeaNotice() {
  const seaOn = useMapStore((s) => s.overlays.some((o) => o.enabled && SEA_OVERLAYS.includes(o.id)));
  if (!seaOn) return null;
  return (
    <p className="mt-2 rounded border border-border bg-surface-secondary px-2 py-1.5 text-xs text-text-secondary" role="note">
      <strong className="font-semibold text-foreground">Ikke til navigation.</strong> Officielle danske søkort er ophavsretligt
      beskyttede og sælges af Geodatastyrelsen. Her vises frie data: grove dybder fra EMODnet (ca. 100 m) og sømærker fra
      OpenSeaMap. Det står også på PDF&apos;en.
    </p>
  );
}
