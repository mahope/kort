import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BaseLayer, MapStyle } from "@/types/map";

export interface Bookmark {
  id: string;
  name: string;
  lng: number;
  lat: number;
  zoom: number;
  bearing: number;
  baseLayer: BaseLayer;
  style: MapStyle;
  scale: number;
  date: string;
}

interface BookmarkStore {
  bookmarks: Bookmark[];
  addBookmark: (name: string) => void;
  removeBookmark: (id: string) => void;
  renameBookmark: (id: string, name: string) => void;
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set) => ({
      bookmarks: [],
      addBookmark: (name) => {
        // Import state at call time to avoid circular deps
        const { useMapStore } = require("@/stores/mapStore");
        const { usePrintStore } = require("@/stores/printStore");
        const mapState = useMapStore.getState();
        const printState = usePrintStore.getState();

        const bookmark: Bookmark = {
          id: crypto.randomUUID(),
          name,
          lng: mapState.viewState.longitude,
          lat: mapState.viewState.latitude,
          zoom: mapState.viewState.zoom,
          bearing: mapState.viewState.bearing,
          baseLayer: mapState.baseLayer,
          style: mapState.style,
          scale: printState.scale,
          date: new Date().toISOString(),
        };
        set((s) => ({ bookmarks: [bookmark, ...s.bookmarks] }));
      },
      removeBookmark: (id) =>
        set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),
      renameBookmark: (id, name) =>
        set((s) => ({
          bookmarks: s.bookmarks.map((b) =>
            b.id === id ? { ...b, name } : b
          ),
        })),
    }),
    { name: "topoprint-bookmarks" }
  )
);
