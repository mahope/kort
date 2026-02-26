"use client";

import { useMapStore } from "@/stores/mapStore";
import { MAP_STYLES } from "@/lib/map/styles";
import type { MapStyle } from "@/types/map";

const STYLE_KEYS = Object.keys(MAP_STYLES) as MapStyle[];

export function MapControls() {
  const currentStyle = useMapStore((s) => s.style);
  const setStyle = useMapStore((s) => s.setStyle);

  return (
    <div className="absolute top-3 left-3 z-10 flex gap-1 rounded-lg bg-white/90 p-1 shadow-md backdrop-blur-sm">
      {STYLE_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setStyle(key)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            currentStyle === key
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {MAP_STYLES[key].label}
        </button>
      ))}
    </div>
  );
}
