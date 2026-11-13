"use client";

import { useEffect, useMemo, useState } from "react";
import { useMapStore } from "@/stores/mapStore";
import { useUiStore } from "@/stores/uiStore";
import { pointCoordinates } from "@/lib/geo/coordinates";
import { decimalYear, isWithinWmmValidity, wmmStatus, wmmStatusNote } from "@/lib/geo/declinationValidity";
import { isFrameTooSmallToSee, usePrintFrameAreaShare } from "@/lib/map/printFrameVisibility";

type DeclinationModule = typeof import("@/lib/geo/declination");

/**
 * Declination for the map centre, recomputed once the map has been still for
 * 200 ms (≈ moveend). The model is loaded when the panel is first opened so it
 * stays out of the initial bundle; null while loading or when the model is out of validity.
 */
function useSettledDeclination(lat: number, lng: number, enabled: boolean): string | null {
  const [pos, setPos] = useState({ lat, lng });
  const [model, setModel] = useState<DeclinationModule | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setPos({ lat, lng }), 200);
    return () => clearTimeout(t);
  }, [lat, lng]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    import("@/lib/geo/declination").then((m) => {
      if (!cancelled) setModel(m);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return useMemo(() => {
    if (!model) return null;
    const now = new Date();
    if (!isWithinWmmValidity(decimalYear(now))) return null;
    return `${model.formatDeclination(model.magneticDeclination(pos.lat, pos.lng, now))} (${now.getUTCFullYear()})`;
  }, [model, pos]);
}

export function CoordinateReadout() {
  const longitude = useMapStore((s) => s.viewState.longitude);
  const latitude = useMapStore((s) => s.viewState.latitude);
  const addToast = useUiStore((s) => s.addToast);
  const coordinates = pointCoordinates(latitude, longitude);
  const [opened, setOpened] = useState(false);
  const declination = useSettledDeclination(latitude, longitude, opened);
  const declinationNote = wmmStatusNote(wmmStatus());
  // The crosshair sits exactly where a small print frame also is; faded out
  // of the way, it is not confused for part of that (barely visible) frame.
  const areaShare = usePrintFrameAreaShare();
  const crosshairDimmed = areaShare !== null && isFrameTooSmallToSee(areaShare);

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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-slate-900 transition-opacity duration-300"
        style={{
          top: "calc((100% - var(--map-pad-bottom, 0px)) / 2)",
          filter: "drop-shadow(0 0 2px white)",
          opacity: crosshairDimmed ? 0.25 : 1,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 0v10m0 8v10M0 14h10m8 0h10" /><circle cx="14" cy="14" r="3" />
        </svg>
      </div>
      <details onToggle={(e) => e.currentTarget.open && setOpened(true)} className="group absolute top-3 right-3 z-20 max-w-[calc(100%-5rem)] rounded-lg bg-surface/95 shadow-md backdrop-blur-sm open:w-[min(19rem,calc(100%-5rem))] md:top-8 md:right-3 md:w-[min(19rem,calc(100%-1rem))]">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">
          <span className="md:hidden group-open:hidden">Koordinat</span>
          <span className="max-md:hidden max-md:group-open:inline">Koordinat ved sigtekorset</span>
        </summary>
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
          {(declination || declinationNote) && (
            <div className="border-t border-border py-1" data-testid="declination-readout">
              <div className="text-xs text-text-secondary">Misvisning</div>
              {declination && <div className="select-text font-mono text-xs tabular-nums">{declination}</div>}
              {declinationNote && <div className="text-xs text-text-secondary" role="note">{declinationNote}</div>}
            </div>
          )}
        </div>
      </details>
    </>
  );
}
