"use client";

import { useState } from "react";
import { useImportStore } from "@/stores/importStore";
import { StylePanel } from "./StylePanel";

export function ImportedLayerList() {
  const layers = useImportStore((s) => s.layers);
  const removeLayer = useImportStore((s) => s.removeLayer);
  const toggleVisibility = useImportStore((s) => s.toggleLayerVisibility);
  const updateStyle = useImportStore((s) => s.updateLayerStyle);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (layers.length === 0) return null;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium mb-1">Importerede lag</label>
      {layers.map((layer) => (
        <div key={layer.id} className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-1 px-2 py-1.5">
            {/* Visibility toggle */}
            <button
              type="button"
              onClick={() => toggleVisibility(layer.id)}
              className="text-text-muted hover:text-text-secondary p-0.5"
              title={layer.visible ? "Skjul lag" : "Vis lag"}
            >
              {layer.visible ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              )}
            </button>

            {/* Color swatch */}
            <span
              className="w-3 h-3 rounded-sm border border-border shrink-0"
              style={{ backgroundColor: layer.style.lineColor }}
            />

            {/* Name - click to expand */}
            <button
              type="button"
              className="flex-1 text-left text-xs truncate hover:text-primary"
              onClick={() => setExpandedId(expandedId === layer.id ? null : layer.id)}
              title={layer.name}
            >
              {layer.name}
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => removeLayer(layer.id)}
              className="text-text-muted hover:text-accent p-0.5"
              title="Slet lag"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Style panel */}
          {expandedId === layer.id && (
            <div className="border-t border-border px-2 py-2">
              <StylePanel
                style={layer.style}
                onUpdate={(s) => updateStyle(layer.id, s)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
