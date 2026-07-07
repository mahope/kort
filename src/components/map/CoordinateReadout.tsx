"use client";

import { useMapStore } from "@/stores/mapStore";
import { useUiStore } from "@/stores/uiStore";
import { latlngToUtm, getUtmZone } from "@/lib/geo/utm";

/**
 * Live readout of the map-centre coordinates in both UTM (ETRS89 / zone 32N)
 * and WGS84. Desktop-only to avoid crowding the mobile map; copies WGS84.
 */
export function CoordinateReadout() {
  const longitude = useMapStore((s) => s.viewState.longitude);
  const latitude = useMapStore((s) => s.viewState.latitude);
  const addToast = useUiStore((s) => s.addToast);

  const zone = getUtmZone(longitude);
  const utm = latlngToUtm(latitude, longitude, zone);
  const wgs = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wgs);
      addToast("success", "Koordinater kopieret");
    } catch {
      addToast("error", "Kunne ikke kopiere");
    }
  };

  return (
    <div className="hidden md:flex absolute top-3 right-3 z-10 items-center gap-2 rounded-lg bg-surface/90 px-3 py-1.5 shadow-md backdrop-blur-sm">
      <div className="font-mono text-[11px] leading-tight text-text-secondary">
        <div>
          UTM {zone}N {Math.round(utm.easting)} {Math.round(utm.northing)}
        </div>
        <div>{wgs}</div>
      </div>
      <button
        type="button"
        onClick={copy}
        title="Kopiér koordinater"
        aria-label="Kopiér koordinater"
        className="shrink-0 text-text-muted hover:text-primary"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
}
