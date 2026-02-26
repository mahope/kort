"use client";

import { useDrawStore } from "@/stores/drawStore";
import type { DrawMode } from "@/stores/drawStore";

interface ToolButton {
  mode: DrawMode;
  label: string;
  icon: React.ReactNode;
}

const TOOLS: ToolButton[] = [
  {
    mode: "point",
    label: "Punkt",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    mode: "line",
    label: "Linje",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" d="M4 20L20 4" />
      </svg>
    ),
  },
  {
    mode: "polygon",
    label: "Polygon",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19L12 5l8 14H4z" />
      </svg>
    ),
  },
  {
    mode: "circle",
    label: "Cirkel",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  {
    mode: "rectangle",
    label: "Rektangel",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="6" width="16" height="12" rx="1" />
      </svg>
    ),
  },
  {
    mode: "select",
    label: "Vælg",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
      </svg>
    ),
  },
];

export function DrawToolbar() {
  const activeMode = useDrawStore((s) => s.activeMode);
  const setMode = useDrawStore((s) => s.setMode);
  const features = useDrawStore((s) => s.features);
  const removeFeature = useDrawStore((s) => s.removeFeature);
  const clearAll = useDrawStore((s) => s.clearAll);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Tegneværktøj</label>
      <div className="flex flex-wrap gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.mode}
            type="button"
            onClick={() => setMode(activeMode === tool.mode ? null : tool.mode)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
              activeMode === tool.mode
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
            }`}
            title={tool.label}
          >
            {tool.icon}
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      {features.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {features.length} feature{features.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Slet alle
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {features.map((f) => {
              const type = f.geojson.geometry?.type || "Unknown";
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between px-2 py-0.5 text-xs bg-gray-50 rounded"
                >
                  <span className="text-gray-600 truncate">{type}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(f.id)}
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
