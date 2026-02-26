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
      <label className="block text-sm font-medium mb-1">Rotation</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={Math.round(bearing)}
          onChange={(e) => setBearing(Number(e.target.value))}
          className="flex-1 h-1 accent-primary"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={-180}
            max={180}
            step={1}
            value={Math.round(bearing)}
            onChange={(e) => setBearing(Number(e.target.value))}
            className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs text-right bg-white"
          />
          <span className="text-xs text-gray-400">°</span>
        </div>
        {bearing !== 0 && (
          <button
            type="button"
            onClick={() => setBearing(0)}
            className="text-xs text-blue-500 hover:text-blue-700"
            title="Nulstil rotation"
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
