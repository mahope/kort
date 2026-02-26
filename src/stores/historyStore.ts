import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaperFormat, Orientation } from "@/types/print";
import type { BaseLayer } from "@/types/map";

export interface HistoryEntry {
  id: string;
  date: string;
  lng: number;
  lat: number;
  zoom: number;
  scale: number;
  paperFormat: PaperFormat;
  orientation: Orientation;
  baseLayer: BaseLayer;
}

const MAX_ENTRIES = 20;

interface HistoryStore {
  entries: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, "id" | "date">) => void;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (data) => {
        const entry: HistoryEntry = {
          ...data,
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
        };
        set((s) => ({
          entries: [entry, ...s.entries].slice(0, MAX_ENTRIES),
        }));
      },
      clearAll: () => set({ entries: [] }),
    }),
    { name: "topoprint-history" }
  )
);
