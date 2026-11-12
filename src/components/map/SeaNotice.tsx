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

/**
 * Always visible on the map while a sea layer is on (also when opened from a
 * link). Starts right of the 44 px strip where the grid puts its northing labels.
 */
export function SeaBadge() {
  const seaOn = useMapStore((s) => s.overlays.some((o) => o.enabled && SEA_OVERLAYS.includes(o.id)));
  if (!seaOn) return null;
  return (
    <div
      className="pointer-events-none absolute left-14 top-[4.25rem] z-[1] rounded bg-white/90 px-2 py-1 text-xs font-semibold leading-tight text-slate-900 shadow-sm"
      role="note"
      data-testid="sea-badge"
    >
      Ikke til navigation
    </div>
  );
}
