"use client";

import { useMapStore } from "@/stores/mapStore";
import { MAP_STYLES } from "@/lib/map/styles";
import type { MapStyle, BaseLayer } from "@/types/map";

const STYLE_KEYS = Object.keys(MAP_STYLES) as MapStyle[];

export function LayerSelector() {
  const baseLayer = useMapStore((s) => s.baseLayer);
  const setBaseLayer = useMapStore((s) => s.setBaseLayer);
  const currentStyle = useMapStore((s) => s.style);
  const setStyle = useMapStore((s) => s.setStyle);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Basiskort</label>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="sidebar-baseLayer"
            checked={baseLayer === "skaermkort"}
            onChange={() => setBaseLayer("skaermkort")}
            className="accent-primary"
          />
          <span className="text-sm">Skærmkort</span>
        </label>
        {baseLayer === "skaermkort" && (
          <select
            value={currentStyle}
            onChange={(e) => setStyle(e.target.value as MapStyle)}
            className="ml-6 rounded-lg border border-border px-2 py-1 text-sm bg-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {STYLE_KEYS.map((key) => (
              <option key={key} value={key}>
                {MAP_STYLES[key].label}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="sidebar-baseLayer"
            checked={baseLayer === "ortofoto"}
            onChange={() => setBaseLayer("ortofoto")}
            className="accent-primary"
          />
          <span className="text-sm">Ortofoto (luftfoto)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="sidebar-baseLayer"
            checked={baseLayer === "dtk25"}
            onChange={() => setBaseLayer("dtk25")}
            className="accent-primary"
          />
          <span className="text-sm">Topo kort 1:25.000</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="sidebar-baseLayer"
            checked={baseLayer === "osm"}
            onChange={() => setBaseLayer("osm")}
            className="accent-primary"
          />
          <span className="text-sm">OpenStreetMap</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="sidebar-baseLayer"
            checked={baseLayer === "historisk_hoeje"}
            onChange={() => setBaseLayer("historisk_hoeje")}
            className="accent-primary"
          />
          <span className="text-sm">Høje Målebordsblade (1842-1899)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="sidebar-baseLayer"
            checked={baseLayer === "historisk_lave"}
            onChange={() => setBaseLayer("historisk_lave")}
            className="accent-primary"
          />
          <span className="text-sm">Lave Målebordsblade (1901-1971)</span>
        </label>
      </div>
    </div>
  );
}
