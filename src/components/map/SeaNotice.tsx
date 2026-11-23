"use client";

import { useMapStore } from "@/stores/mapStore";
import { DDM_TERMS_URL, NAVIGATION_WARNING, SEA_OVERLAYS, SOEKORT_DDM_RETRIEVED, SOURCES_PAGE_PATH } from "@/lib/map/sources";

/** Shown while a sea layer is on: what the data is, and that it is not a chart. */
export function SeaNotice() {
  const seaOn = useMapStore((s) => s.overlays.some((o) => o.enabled && SEA_OVERLAYS.includes(o.id)));
  if (!seaOn) return null;
  return (
    <p className="mt-2 rounded border border-border bg-surface-secondary px-2 py-1.5 text-xs text-text-secondary" role="note">
      <strong className="font-semibold text-foreground">{NAVIGATION_WARNING}</strong> Officielle søkort er ophavsretligt
      beskyttede og sælges af Geodatastyrelsen. Her vises frie data, bearbejdet og forenklet til kortet: søkortets
      dybder, kurver og tal er beregnet af os fra Danmarks Dybdemodel (50 m, hentet {SOEKORT_DDM_RETRIEVED},{" "}
      <a href={DDM_TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline">
        vilkår
      </a>
      ), grovere dybder fra EMODnet uden for danske farvande og dybdekurver i 80 søer fra Miljøportalen (mest i
      Jylland; ikke Furesø og de andre store sjællandske søer). Havbundens relief er fra Dybdemodellen, sømærker fra
      OpenSeaMap, vrag fra EMODnet
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
  const seaOn = useMapStore((s) => s.overlays.some((o) => o.enabled && SEA_OVERLAYS.includes(o.id)));
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
