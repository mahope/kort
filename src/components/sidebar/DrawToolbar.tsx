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

const GEOMETRY_LABELS: Record<string, string> = {
  Point: "Punkt",
  LineString: "Linje",
  Polygon: "Polygon",
  MultiPoint: "Punkter",
  MultiLineString: "Linjer",
  MultiPolygon: "Polygoner",
};

export function DrawToolbar() {
  const activeMode = useDrawStore((s) => s.activeMode);
  const setMode = useDrawStore((s) => s.setMode);
  const features = useDrawStore((s) => s.features);
  const removeFeature = useDrawStore((s) => s.removeFeature);
  const updateFeatureStyle = useDrawStore((s) => s.updateFeatureStyle);
  const renameFeature = useDrawStore((s) => s.renameFeature);
  const clearAll = useDrawStore((s) => s.clearAll);
  const undo = useDrawStore((s) => s.undo);
  const redo = useDrawStore((s) => s.redo);
  const canUndo = useDrawStore((s) => s.past.length > 0);
  const canRedo = useDrawStore((s) => s.future.length > 0);
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
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface text-foreground border-border hover:border-text-muted"
            }`}
            title={tool.label}
          >
            {tool.icon}
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-1 flex gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="Fortryd (Ctrl+Z)"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-border text-foreground hover:border-text-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          Fortryd
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="Gentag (Ctrl+Shift+Z)"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-border text-foreground hover:border-text-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
          </svg>
          Gentag
        </button>
      </div>

      {features.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              {features.length} feature{features.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => {
                if (confirm("Slet alle tegninger?")) clearAll();
              }}
              className="text-xs text-danger hover:text-danger-hover"
            >
              Slet alle
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {features.map((f) => {
              const type = f.geojson.geometry?.type || "Unknown";
              const typeLabel = GEOMETRY_LABELS[type] ?? type;
              const name = (f.geojson.properties?.name as string) ?? "";
              return (
                <div key={f.id} className="border border-border rounded overflow-hidden">
                  <div className="flex items-center gap-1 px-2 py-0.5 text-xs bg-surface-secondary">
                    <span
                      className="inline-block w-2 h-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: f.style.lineColor }}
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => renameFeature(f.id, e.target.value)}
                      placeholder={typeLabel}
                      aria-label="Navn på tegning"
                      className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-text-muted focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                      title="Stil"
                      aria-label="Rediger stil"
                      className="text-text-muted hover:text-primary shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z M9 11v3h3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFeature(f.id)}
                      title="Slet"
                      aria-label="Slet tegning"
                      className="text-text-muted hover:text-danger shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
