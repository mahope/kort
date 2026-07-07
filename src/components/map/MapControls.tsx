"use client";

import { useState, useRef, useEffect } from "react";
import { useMapStore } from "@/stores/mapStore";
import { MAP_STYLES } from "@/lib/map/styles";
import { BASE_LAYERS } from "@/constants/baseLayers";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { MapStyle, OverlayId } from "@/types/map";

const STYLE_KEYS = Object.keys(MAP_STYLES) as MapStyle[];

const OVERLAY_LABELS: Record<OverlayId, string> = {
  contours: "Højdekurver",
  hillshade: "Skyggekort",
  stednavne: "Stednavne",
  matrikel: "Matrikelskel",
};

export function MapControls() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStyle = useMapStore((s) => s.style);
  const setStyle = useMapStore((s) => s.setStyle);
  const baseLayer = useMapStore((s) => s.baseLayer);
  const setBaseLayer = useMapStore((s) => s.setBaseLayer);
  const overlays = useMapStore((s) => s.overlays);
  const toggleOverlay = useMapStore((s) => s.toggleOverlay);
  const setOverlayOpacity = useMapStore((s) => s.setOverlayOpacity);

  // Close the panel when clicking outside of it.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="absolute top-3 left-3 z-10">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 rounded-lg bg-surface/90 px-3 py-2 text-sm font-medium shadow-md backdrop-blur-sm hover:bg-surface transition-colors"
        title="Kortlag"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        {!isMobile && "Kortlag"}
      </button>

      {isOpen && (
        <div className="mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-lg bg-surface/95 p-3 shadow-lg backdrop-blur-sm">
          {/* Base layer */}
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Basiskort</h3>
            <div className="space-y-1">
              {BASE_LAYERS.map((layer) => (
                <div key={layer.value}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="baseLayer"
                      checked={baseLayer === layer.value}
                      onChange={() => setBaseLayer(layer.value)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{layer.label}</span>
                  </label>
                  {layer.hasStyles && baseLayer === layer.value && (
                    <div className="ml-6 mt-1 flex gap-1 flex-wrap">
                      {STYLE_KEYS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setStyle(key)}
                          className={`rounded px-2 py-1 text-xs transition-colors ${
                            currentStyle === key
                              ? "bg-primary text-on-primary"
                              : "bg-surface-secondary text-text-secondary hover:bg-border"
                          }`}
                        >
                          {MAP_STYLES[key].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Overlays */}
          <div className="border-t border-border pt-3">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Ekstra lag</h3>
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
                      <span className="text-xs text-text-muted w-16">Synlighed</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={overlay.opacity}
                        onChange={(e) => setOverlayOpacity(overlay.id, Number(e.target.value))}
                        className="flex-1 h-1.5 accent-primary"
                      />
                      <span className="text-xs text-text-secondary w-8 text-right">
                        {Math.round(overlay.opacity * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
