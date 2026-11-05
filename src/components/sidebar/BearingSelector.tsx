"use client";

import { useMapStore } from "@/stores/mapStore";

export function BearingSelector() {
  const bearing = useMapStore((s) => s.viewState.bearing);
  const viewState = useMapStore((s) => s.viewState);
  const setViewState = useMapStore((s) => s.setViewState);

  const setBearing = (newBearing: number) => {
    // Normalize to -180..180
    let b = newBearing % 360;
    if (b > 180) b -= 360;
    if (b < -180) b += 360;
    setViewState({ ...viewState, bearing: b });
  };

  return (
    <div>
      <span className="block text-sm font-medium mb-1">Rotation</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          aria-label="Rotation, skyder"
          min={-180}
          max={180}
          step={1}
          value={Math.round(bearing)}
          onChange={(e) => setBearing(Number(e.target.value))}
          className="flex-1 h-1 pointer-coarse:h-11 accent-primary"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            aria-label="Rotation (grader)"
            min={-180}
            max={180}
            step={1}
            value={Math.round(bearing)}
            onChange={(e) => setBearing(Number(e.target.value))}
            className="w-14 rounded border border-border px-1 py-0.5 pointer-coarse:min-h-11 pointer-coarse:w-16 text-xs pointer-coarse:text-base text-right bg-surface"
          />
          <span className="text-xs text-text-muted">°</span>
        </div>
        {bearing !== 0 && (
          <button
            type="button"
            onClick={() => setBearing(0)}
            className="flex items-center justify-center text-xs text-primary hover:text-primary-hover pointer-coarse:h-11 pointer-coarse:w-11"
            title="Nulstil rotation"
            aria-label="Nulstil rotation"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
