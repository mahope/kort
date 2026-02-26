"use client";

import { useState, useCallback, useRef } from "react";
import { parseFile } from "@/lib/import/parser";
import { useImportStore } from "@/stores/importStore";
import { useMapStore } from "@/stores/mapStore";
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

  const handleImport = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);
      try {
        const layer: ImportedLayer = await parseFile(file);
        addLayer(layer);

        // Auto-zoom to imported data
        const bbox = getBoundingBox(layer.geojson);
        if (bbox) {
          const centerLng = (bbox[0] + bbox[2]) / 2;
          const centerLat = (bbox[1] + bbox[3]) / 2;
          // Estimate zoom from bbox size
          const lngSpan = bbox[2] - bbox[0];
          const latSpan = bbox[3] - bbox[1];
          const maxSpan = Math.max(lngSpan, latSpan);
          const zoom = Math.max(6, Math.min(16, Math.floor(Math.log2(360 / maxSpan))));
          flyTo(centerLng, centerLat, zoom);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ukendt fejl ved import");
      } finally {
        setIsLoading(false);
      }
    },
    [addLayer, flyTo]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImport(file);
    },
    [handleImport]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImport(file);
      // Reset input so same file can be re-imported
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
            ? "border-blue-500 bg-blue-50"
            : "border-border hover:border-text-muted"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
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
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
