"use client";

import { useHistoryStore, type HistoryEntry } from "@/stores/historyStore";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";

export function HistoryPanel() {
  const entries = useHistoryStore((s) => s.entries);
  const clearAll = useHistoryStore((s) => s.clearAll);

  const handleGoTo = (entry: HistoryEntry) => {
    const mapStore = useMapStore.getState();
    const printStore = usePrintStore.getState();

    mapStore.flyTo(entry.lng, entry.lat, entry.zoom);
    mapStore.setBaseLayer(entry.baseLayer);
    printStore.setScale(entry.scale);
    printStore.setPaperFormat(entry.paperFormat);
    printStore.setOrientation(entry.orientation);
  };

  if (entries.length === 0) {
    return (
      <p className="text-xs text-text-muted">Ingen udskriftshistorik endnu</p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary">
          {entries.length} udskrift{entries.length !== 1 ? "er" : ""}
        </span>
        <button
          type="button"
          onClick={clearAll}
          className="text-[10px] text-accent hover:text-accent/80"
        >
          Slet alle
        </button>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {entries.map((entry) => {
          const date = new Date(entry.date);
          const dateStr = date.toLocaleDateString("da-DK", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          const scaleStr = `1:${entry.scale.toLocaleString("da-DK")}`;

          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => handleGoTo(entry)}
              className="w-full text-left px-2 py-1 rounded bg-surface-secondary text-xs hover:bg-border transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">{dateStr}</span>
                <span className="text-text-muted">{scaleStr}</span>
              </div>
              <div className="text-text-muted text-[10px]">
                {entry.paperFormat} {entry.orientation === "landscape" ? "landskab" : "portræt"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
