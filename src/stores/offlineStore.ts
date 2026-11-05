import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PrintFrameBounds } from "@/types/print";

export interface OfflineArea {
  id: string;
  createdAt: number;
  bounds: PrintFrameBounds;
  layerIds: string[];
  tileCount: number;
  bytes: number;
  /** Tiles that could not be fetched (area has gaps). */
  failedCount?: number;
}

interface OfflineStore {
  areas: OfflineArea[];
  addArea: (area: OfflineArea) => void;
  removeArea: (id: string) => void;
}

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set) => ({
      areas: [],
      addArea: (area) => set((s) => ({ areas: [...s.areas, area] })),
      removeArea: (id) => set((s) => ({ areas: s.areas.filter((a) => a.id !== id) })),
    }),
    { name: "offline-areas" }
  )
);
