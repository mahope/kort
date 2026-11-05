"use client";

import { useEffect, useMemo, useState } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useUiStore } from "@/stores/uiStore";
import { pointCoordinates } from "@/lib/geo/coordinates";
import { formatDeclination, magneticDeclination } from "@/lib/geo/declination";

/** Declination for the map centre, recomputed once the map has been still for 200 ms (≈ moveend). */
function useSettledDeclination(lat: number, lng: number): string | null {
  const [pos, setPos] = useState({ lat, lng });
  useEffect(() => {
    const t = setTimeout(() => setPos({ lat, lng }), 200);
    return () => clearTimeout(t);
  }, [lat, lng]);
  return useMemo(() => {
    try {
      const now = new Date();
      return `${formatDeclination(magneticDeclination(pos.lat, pos.lng, now))} (${now.getUTCFullYear()})`;
    } catch (e) {
      if (e instanceof RangeError) return null; // model out of validity
      throw e;
    }
  }, [pos]);
}

export function CoordinateReadout() {
  const longitude = useMapStore((s) => s.viewState.longitude);
  const latitude = useMapStore((s) => s.viewState.latitude);
  const addToast = useUiStore((s) => s.addToast);
  const coordinates = pointCoordinates(latitude, longitude);
  const declination = useSettledDeclination(latitude, longitude);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      addToast("success", "Koordinat kopieret");
    } catch {
      addToast("error", "Kunne ikke kopiere. Markér og kopiér koordinatet.");
    }
  };

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-slate-900" style={{ filter: "drop-shadow(0 0 2px white)" }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 0v10m0 8v10M0 14h10m8 0h10" /><circle cx="14" cy="14" r="3" />
        </svg>
      </div>
      <details className="absolute top-20 right-2 z-20 w-[min(19rem,calc(100%-1rem))] rounded-lg bg-surface/95 shadow-md backdrop-blur-sm md:top-8 md:right-3">
        <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">Koordinat ved sigtekorset</summary>
        <div className="px-3 pb-3">
          <p className="mb-2 text-xs text-text-secondary">Flyt kortet, så punktet ligger i sigtekorset.</p>
          {coordinates.map(({ name, value }) => (
            <div key={name} className="flex items-center gap-2 border-t border-border py-1">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-text-secondary">{name}</div>
                <div className="select-text font-mono text-xs tabular-nums">{value}</div>
              </div>
              <button type="button" onClick={() => copy(value)} aria-label={`Kopiér ${name}`}
                className="min-h-11 min-w-11 rounded px-2 text-xs text-primary hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-primary">Kopiér</button>
            </div>
          ))}
          {declination && (
            <div className="border-t border-border py-1" data-testid="declination-readout">
              <div className="text-xs text-text-secondary">Misvisning</div>
              <div className="select-text font-mono text-xs tabular-nums">{declination}</div>
            </div>
          )}
        </div>
      </details>
    </>
  );
}
