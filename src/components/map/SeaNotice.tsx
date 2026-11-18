"use client";

import { useMapStore } from "@/stores/mapStore";
import type { BaseLayer, OverlayState } from "@/types/map";
import { DDM_TERMS_URL, NAVIGATION_WARNING, SEA_OVERLAYS, SOURCES_PAGE_PATH, isSeaBaseLayer } from "@/lib/map/sources";

/** A sea overlay or the "Søkort" base map is on. */
function seaShown(s: { overlays: OverlayState[]; baseLayer: BaseLayer }): boolean {
  return isSeaBaseLayer(s.baseLayer) || s.overlays.some((o) => o.enabled && SEA_OVERLAYS.includes(o.id));
}

/** Shown while a sea layer is on: what the data is, and that it is not a chart. */
export function SeaNotice() {
  const seaOn = useMapStore(seaShown);
  if (!seaOn) return null;
  return (
    <p className="mt-2 rounded border border-border bg-surface-secondary px-2 py-1.5 text-xs text-text-secondary" role="note">
      <strong className="font-semibold text-foreground">{NAVIGATION_WARNING}</strong> Officielle søkort er ophavsretligt
      beskyttede og sælges af Geodatastyrelsen. Her vises frie data, bearbejdet og forenklet til kortet: dybder og
      havbundens relief fra Danmarks Dybdemodel (50 m,{" "}
      <a href={DDM_TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline">
        vilkår
      </a>
      ), grovere dybder fra EMODnet (også i basiskortet Søkort, med land og havne fra OpenStreetMap og Natura
      2000 fra Miljøportalen), sømærker fra OpenSeaMap, dybdekurver i 80 søer fra Miljøportalen, vrag fra EMODnet
      og historiske indsøkort, som kommer med som ekstra sider i PDF&apos;en. Kortet er til orientering og
      turplanlægning. Advarslen står også på PDF&apos;en.{" "}
      <a href={SOURCES_PAGE_PATH} className="underline">
        Alle kilder
      </a>
    </p>
  );
}

/**
 * Always visible on the map while a sea layer is on (also when opened from a
 * link). Starts right of the 44 px strip where the grid puts its northing labels.
 */
export function SeaBadge() {
  const seaOn = useMapStore(seaShown);
  if (!seaOn) return null;
  return (
    <div
      className="pointer-events-none absolute left-14 top-[4.25rem] z-[1] rounded bg-white/90 px-2 py-1 text-xs font-semibold leading-tight text-slate-900 shadow-sm"
      role="note"
      data-testid="sea-badge"
    >
      Må ikke bruges til navigation
    </div>
  );
}
