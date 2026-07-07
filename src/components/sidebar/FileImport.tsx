"use client";

import { useState, useCallback, useRef } from "react";
import { parseFile } from "@/lib/import/parser";
import { useImportStore } from "@/stores/importStore";
import { useMapStore } from "@/stores/mapStore";
import { useUiStore } from "@/stores/uiStore";
import type { ImportedLayer } from "@/stores/importStore";

function getBoundingBox(geojson: GeoJSON.FeatureCollection): [number, number, number, number] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  let hasCoords = false;

  function processCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      hasCoords = true;
      const [lng, lat] = coords as [number, number];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      for (const c of coords) processCoords(c);
    }
  }

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if ("coordinates" in geom) {
      processCoords(geom.coordinates);
    }
  }

  return hasCoords ? [minLng, minLat, maxLng, maxLat] : null;
}

const ACCEPTED = ".gpx,.kml,.geojson,.json";

export function FileImport() {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addLayer = useImportStore((s) => s.addLayer);
  const flyTo = useMapStore((s) => s.flyTo);
  const addToast = useUiStore((s) => s.addToast);

  const handleImport = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      setError(null);
      setIsLoading(true);

      let lastLayer: ImportedLayer | null = null;
      let successCount = 0;
      const errors: string[] = [];

      for (const file of files) {
        try {
          const layer = await parseFile(file);
          addLayer(layer);
          lastLayer = layer;
          successCount++;
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : "fejl"}`);
        }
      }
      setIsLoading(false);

      if (successCount > 0) {
        addToast("success", `${successCount} fil${successCount !== 1 ? "er" : ""} importeret`);
        // Auto-zoom to the last imported layer.
        const bbox = lastLayer && getBoundingBox(lastLayer.geojson);
        if (bbox) {
          const centerLng = (bbox[0] + bbox[2]) / 2;
          const centerLat = (bbox[1] + bbox[3]) / 2;
          const maxSpan = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]) || 0.01;
          const zoom = Math.max(6, Math.min(16, Math.floor(Math.log2(360 / maxSpan))));
          flyTo(centerLng, centerLat, zoom);
        }
      }
      if (errors.length > 0) {
        setError(errors.join(" · "));
        addToast("error", `Kunne ikke importere: ${errors[0]}`, 8000);
      }
    },
    [addLayer, flyTo, addToast]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) handleImport(e.dataTransfer.files);
    },
    [handleImport]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) handleImport(e.target.files);
      // Reset input so the same file can be re-imported
      e.target.value = "";
    },
    [handleImport]
  );

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-text-muted"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={onChange}
          className="hidden"
        />
        {isLoading ? (
          <p className="text-sm text-text-secondary">Importerer...</p>
        ) : (
          <>
            <svg className="w-6 h-6 mx-auto mb-1 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-xs text-text-secondary">
              Træk fil hertil eller klik
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              GPX, KML, GeoJSON
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="text-xs text-danger mt-1">{error}</p>
      )}
    </div>
  );
}
