"use client";

import { useMapStore } from "@/stores/mapStore";
import { OVERLAY_LABELS } from "@/lib/map/sources";
import { SeaNotice } from "@/components/map/SeaNotice";

export function OverlaySelector() {
  const overlays = useMapStore((s) => s.overlays);
  const toggleOverlay = useMapStore((s) => s.toggleOverlay);
  const setOverlayOpacity = useMapStore((s) => s.setOverlayOpacity);

  return (
    <div>
      <div className="space-y-2">
        {overlays.map((overlay) => (
          <div key={overlay.id}>
            <label className="flex items-center gap-2 cursor-pointer pointer-coarse:min-h-11">
              <input
                type="checkbox"
                checked={overlay.enabled}
                onChange={() => toggleOverlay(overlay.id)}
                className="accent-primary pointer-coarse:h-5 pointer-coarse:w-5"
              />
              <span className="text-sm">{OVERLAY_LABELS[overlay.id]}</span>
            </label>
            {overlay.enabled && (
              <div className="ml-6 mt-1 flex items-center gap-2">
                <span className="text-xs text-text-muted">Gennemsigtighed</span>
                <input
                  type="range"
                  aria-label={`Gennemsigtighed: ${OVERLAY_LABELS[overlay.id]}`}
                  min={0}
                  max={1}
                  step={0.05}
                  value={overlay.opacity}
                  onChange={(e) =>
                    setOverlayOpacity(overlay.id, Number(e.target.value))
                  }
                  className="flex-1 h-1 pointer-coarse:h-11 accent-primary"
                />
                <span className="text-xs text-text-secondary w-8 text-right">
                  {Math.round(overlay.opacity * 100)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <SeaNotice />
    </div>
  );
}
