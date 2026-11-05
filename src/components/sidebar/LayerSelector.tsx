"use client";

import { useMapStore } from "@/stores/mapStore";
import { MAP_STYLES } from "@/lib/map/styles";
import { BASE_LAYERS } from "@/constants/baseLayers";
import type { MapStyle } from "@/types/map";

const STYLE_KEYS = Object.keys(MAP_STYLES) as MapStyle[];

export function LayerSelector() {
  const baseLayer = useMapStore((s) => s.baseLayer);
  const setBaseLayer = useMapStore((s) => s.setBaseLayer);
  const currentStyle = useMapStore((s) => s.style);
  const setStyle = useMapStore((s) => s.setStyle);

  return (
    <div>
      <span id="sidebar-baseLayer-label" className="block text-sm font-medium mb-1">Basiskort</span>
      <div role="radiogroup" aria-labelledby="sidebar-baseLayer-label" className="space-y-2">
        {BASE_LAYERS.map((layer) => (
          <div key={layer.value}>
            <label className="flex items-center gap-2 cursor-pointer pointer-coarse:min-h-11">
              <input
                type="radio"
                name="sidebar-baseLayer"
                checked={baseLayer === layer.value}
                onChange={() => setBaseLayer(layer.value)}
                className="accent-primary pointer-coarse:h-5 pointer-coarse:w-5"
              />
              <span className="text-sm">{layer.label}</span>
            </label>
            {layer.hasStyles && baseLayer === layer.value && (
              <select
                aria-label="Kortstil"
                value={currentStyle}
                onChange={(e) => setStyle(e.target.value as MapStyle)}
                className="ml-6 mt-1 rounded-lg border border-border px-2 py-1 text-sm pointer-coarse:min-h-11 pointer-coarse:text-base bg-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {STYLE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {MAP_STYLES[key].label}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
