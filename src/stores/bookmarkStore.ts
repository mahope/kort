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
  addBookmark: (name: string, mapState: { longitude: number; latitude: number; zoom: number; bearing: number; baseLayer: BaseLayer; style: MapStyle }, scale: number) => void;
  addBookmarkFull: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;
  renameBookmark: (id: string, name: string) => void;
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set) => ({
      bookmarks: [],
      addBookmark: (name, mapState, scale) => {
        const bookmark: Bookmark = {
          id: crypto.randomUUID(),
          name,
          lng: mapState.longitude,
          lat: mapState.latitude,
          zoom: mapState.zoom,
          bearing: mapState.bearing,
          baseLayer: mapState.baseLayer,
          style: mapState.style,
          scale,
          date: new Date().toISOString(),
        };
        set((s) => ({ bookmarks: [bookmark, ...s.bookmarks] }));
      },
      addBookmarkFull: (bookmark) =>
        set((s) => ({ bookmarks: [bookmark, ...s.bookmarks] })),
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
