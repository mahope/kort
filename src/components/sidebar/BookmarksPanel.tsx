"use client";

import { useState } from "react";
import { useBookmarkStore, type Bookmark } from "@/stores/bookmarkStore";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";

export function BookmarksPanel() {
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const addBookmark = useBookmarkStore((s) => s.addBookmark);
  const removeBookmark = useBookmarkStore((s) => s.removeBookmark);
  const renameBookmark = useBookmarkStore((s) => s.renameBookmark);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    const name = `Bogmærke ${bookmarks.length + 1}`;
    addBookmark(name);
  };

  const handleGoTo = (bookmark: Bookmark) => {
    const mapStore = useMapStore.getState();
    const printStore = usePrintStore.getState();

    mapStore.flyTo(bookmark.lng, bookmark.lat, bookmark.zoom);
    mapStore.setBaseLayer(bookmark.baseLayer);
    mapStore.setStyle(bookmark.style);
    printStore.setScale(bookmark.scale);

    // Set bearing after flyTo
    setTimeout(() => {
      const vs = useMapStore.getState().viewState;
      mapStore.setViewState({ ...vs, bearing: bookmark.bearing });
    }, 100);
  };

  const startRename = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setEditName(bookmark.name);
  };

  const submitRename = () => {
    if (editingId && editName.trim()) {
      renameBookmark(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleExport = () => {
    const json = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bogmaerker.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as Bookmark[];
        if (Array.isArray(data)) {
          const store = useBookmarkStore.getState();
          for (const b of data) {
            if (b.lng && b.lat && b.name) {
              store.addBookmark(b.name);
              // Update the last added bookmark with full data
              const added = useBookmarkStore.getState().bookmarks[0];
              if (added) {
                useBookmarkStore.setState((s) => ({
                  bookmarks: s.bookmarks.map((bm) =>
                    bm.id === added.id ? { ...bm, ...b, id: added.id } : bm
                  ),
                }));
              }
            }
          }
        }
      } catch {
        alert("Kunne ikke importere bogmærker");
      }
    };
    input.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Gem position
        </button>
        {bookmarks.length > 0 && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleExport}
              className="text-[10px] text-text-secondary hover:text-foreground"
              title="Eksportér bogmærker"
            >
              Eksport
            </button>
            <span className="text-text-muted text-[10px]">|</span>
            <button
              type="button"
              onClick={handleImport}
              className="text-[10px] text-text-secondary hover:text-foreground"
              title="Importér bogmærker"
            >
              Import
            </button>
          </div>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <p className="text-xs text-text-muted">Ingen bogmærker endnu</p>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {bookmarks.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-1 px-2 py-1 rounded bg-surface-secondary text-xs group"
            >
              {editingId === b.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={submitRename}
                  onKeyDown={(e) => e.key === "Enter" && submitRename()}
                  autoFocus
                  className="flex-1 bg-surface border border-border rounded px-1 py-0.5 text-xs"
                />
              ) : (
                <button
                  type="button"
                  className="flex-1 text-left truncate hover:text-primary"
                  onClick={() => handleGoTo(b)}
                  onDoubleClick={() => startRename(b)}
                  title={`${b.name} — dobbeltklik for at omdøbe`}
                >
                  {b.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeBookmark(b.id)}
                className="text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
