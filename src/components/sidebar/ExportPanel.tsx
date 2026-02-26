"use client";

import { useState } from "react";
import { useImportStore } from "@/stores/importStore";
import { useDrawStore } from "@/stores/drawStore";
import {
  exportAsGeoJSON,
  exportAsGPX,
  exportAsKML,
  copyToClipboard,
  downloadFile,
} from "@/lib/import/exporter";

type ExportFormat = "geojson" | "gpx" | "kml";

export function ExportPanel() {
  const [format, setFormat] = useState<ExportFormat>("geojson");
  const [copied, setCopied] = useState(false);
  const importedLayers = useImportStore((s) => s.layers);
  const drawnFeatures = useDrawStore((s) => s.features);

  // Collect all features
  const allFeatures: GeoJSON.Feature[] = [
    ...importedLayers.flatMap((l) => l.geojson.features),
    ...drawnFeatures.map((f) => f.geojson),
  ];

  const hasFeatures = allFeatures.length > 0;

  const handleDownload = () => {
    if (!hasFeatures) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case "gpx":
        content = exportAsGPX(allFeatures);
        filename = "eksport.gpx";
        mimeType = "application/gpx+xml";
        break;
      case "kml":
        content = exportAsKML(allFeatures);
        filename = "eksport.kml";
        mimeType = "application/vnd.google-earth.kml+xml";
        break;
      default:
        content = exportAsGeoJSON(allFeatures);
        filename = "eksport.geojson";
        mimeType = "application/geo+json";
        break;
    }

    downloadFile(content, filename, mimeType);
  };

  const handleCopy = async () => {
    if (!hasFeatures) return;
    const content = exportAsGeoJSON(allFeatures);
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasFeatures) return null;

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Eksport</label>
      <div className="flex items-center gap-2">
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          className="rounded border border-gray-300 px-2 py-1 text-xs bg-white"
        >
          <option value="geojson">GeoJSON</option>
          <option value="gpx">GPX</option>
          <option value="kml">KML</option>
        </select>
        <button
          type="button"
          onClick={handleDownload}
          className="px-2 py-1 rounded text-xs bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Download
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="px-2 py-1 rounded text-xs border border-gray-300 hover:border-gray-400 transition-colors"
        >
          {copied ? "Kopieret!" : "Kopiér GeoJSON"}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">
        {allFeatures.length} feature{allFeatures.length !== 1 ? "s" : ""} ({importedLayers.length} importerede lag, {drawnFeatures.length} tegnede)
      </p>
    </div>
  );
}
