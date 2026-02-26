"use client";

import { useState, useEffect } from "react";
import { useDrawStore } from "@/stores/drawStore";
import {
  calculateDistance,
  calculateArea,
  formatDistance,
  formatArea,
} from "@/lib/geo/measure";

type MeasureMode = "distance" | "area";

function extractCoords(feature: GeoJSON.Feature): [number, number][] {
  const geom = feature.geometry;
  if (geom.type === "LineString") {
    return geom.coordinates as [number, number][];
  }
  if (geom.type === "Polygon") {
    return geom.coordinates[0] as [number, number][];
  }
  return [];
}

export function MeasureTool() {
  const [mode, setMode] = useState<MeasureMode>("distance");
  const [isActive, setIsActive] = useState(false);
  const setDrawMode = useDrawStore((s) => s.setMode);
  const features = useDrawStore((s) => s.features);
  const activeDrawMode = useDrawStore((s) => s.activeMode);

  // When measure tool activates, set appropriate draw mode
  useEffect(() => {
    if (!isActive) return;
    if (mode === "distance") {
      setDrawMode("line");
    } else {
      setDrawMode("polygon");
    }
  }, [isActive, mode, setDrawMode]);

  // Calculate measurements from the latest matching feature
  const measurements = features
    .filter((f) => {
      const type = f.geojson.geometry?.type;
      if (mode === "distance") return type === "LineString";
      return type === "Polygon";
    })
    .map((f) => {
      const coords = extractCoords(f.geojson);
      if (mode === "distance") {
        return { id: f.id, value: formatDistance(calculateDistance(coords)) };
      }
      return { id: f.id, value: formatArea(calculateArea(coords)) };
    });

  const toggleActive = () => {
    if (isActive) {
      setIsActive(false);
      setDrawMode(null);
    } else {
      setIsActive(true);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Mål</label>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => { setMode("distance"); if (isActive) setDrawMode("line"); }}
            className={`px-2 py-1 ${
              mode === "distance" ? "bg-gray-200 font-medium" : "bg-white"
            }`}
          >
            Afstand
          </button>
          <button
            type="button"
            onClick={() => { setMode("area"); if (isActive) setDrawMode("polygon"); }}
            className={`px-2 py-1 border-l border-gray-300 ${
              mode === "area" ? "bg-gray-200 font-medium" : "bg-white"
            }`}
          >
            Areal
          </button>
        </div>
        <button
          type="button"
          onClick={toggleActive}
          className={`px-2 py-1 rounded text-xs border transition-colors ${
            isActive
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
          }`}
        >
          {isActive ? "Stop" : "Start"}
        </button>
      </div>

      {measurements.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {measurements.map((m, i) => (
            <div
              key={m.id}
              className="text-xs bg-gray-50 rounded px-2 py-1 flex items-center justify-between"
            >
              <span className="text-gray-500">
                {mode === "distance" ? "Afstand" : "Areal"} {measurements.length > 1 ? i + 1 : ""}
              </span>
              <span className="font-medium">{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
