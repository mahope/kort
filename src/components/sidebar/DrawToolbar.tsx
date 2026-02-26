"use client";

import { useState } from "react";
import { useDrawStore } from "@/stores/drawStore";
import { StylePanel } from "./StylePanel";
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
  const updateFeatureStyle = useDrawStore((s) => s.updateFeatureStyle);
  const clearAll = useDrawStore((s) => s.clearAll);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                : "bg-surface text-foreground border-border hover:border-text-muted"
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
            <span className="text-xs text-text-secondary">
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
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {features.map((f) => {
              const type = f.geojson.geometry?.type || "Unknown";
              return (
                <div key={f.id} className="border border-border rounded overflow-hidden">
                  <div className="flex items-center justify-between px-2 py-0.5 text-xs bg-surface-secondary">
                    <button
                      type="button"
                      className="flex-1 text-left text-foreground truncate hover:text-primary"
                      onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-sm mr-1"
                        style={{ backgroundColor: f.style.lineColor }}
                      />
                      {type}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFeature(f.id)}
                      className="text-text-muted hover:text-accent ml-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {expandedId === f.id && (
                    <div className="border-t border-border px-2 py-2">
                      <StylePanel
                        style={f.style}
                        onUpdate={(s) => updateFeatureStyle(f.id, s)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-text-muted mt-1">Styling påvirker PDF og eksport</p>
        </div>
      )}
    </div>
  );
}
