"use client";

import { useMapStore } from "@/stores/mapStore";
import type { OverlayId } from "@/types/map";

const OVERLAY_LABELS: Record<OverlayId, string> = {
  contours: "Højdekurver (0,5 m)",
  hillshade: "Skyggekort (terræn)",
};

export function OverlaySelector() {
  const overlays = useMapStore((s) => s.overlays);
  const toggleOverlay = useMapStore((s) => s.toggleOverlay);
  const setOverlayOpacity = useMapStore((s) => s.setOverlayOpacity);
  const showUtmGrid = useMapStore((s) => s.showUtmGrid);
  const toggleUtmGrid = useMapStore((s) => s.toggleUtmGrid);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Overlays</label>
      <div className="space-y-2">
        {overlays.map((overlay) => (
          <div key={overlay.id}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={overlay.enabled}
                onChange={() => toggleOverlay(overlay.id)}
                className="accent-primary"
              />
              <span className="text-sm">{OVERLAY_LABELS[overlay.id]}</span>
            </label>
            {overlay.enabled && (
              <div className="ml-6 mt-1 flex items-center gap-2">
                <span className="text-xs text-gray-400">Gennemsigtighed</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={overlay.opacity}
                  onChange={(e) =>
                    setOverlayOpacity(overlay.id, Number(e.target.value))
                  }
                  className="flex-1 h-1 accent-primary"
                />
                <span className="text-xs text-gray-500 w-8 text-right">
                  {Math.round(overlay.opacity * 100)}%
                </span>
              </div>
            )}
          </div>
        ))}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUtmGrid}
              onChange={toggleUtmGrid}
              className="accent-primary"
            />
            <span className="text-sm">UTM-gitter (zone 32N)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
