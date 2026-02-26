import { create } from "zustand";
import type { LayerStyle } from "./importStore";

export type DrawMode =
  | "point"
  | "line"
  | "polygon"
  | "circle"
  | "rectangle"
  | "select"
  | null;

export interface DrawnFeature {
  id: string;
  geojson: GeoJSON.Feature;
  style: LayerStyle;
}

interface DrawStore {
  activeMode: DrawMode;
  features: DrawnFeature[];
  setMode: (mode: DrawMode) => void;
  setFeatures: (features: DrawnFeature[]) => void;
  removeFeature: (id: string) => void;
  updateFeatureStyle: (id: string, style: Partial<LayerStyle>) => void;
  clearAll: () => void;
}

const DEFAULT_STYLE: LayerStyle = {
  lineColor: "#dc2626",
  lineWidth: 3,
  lineStyle: "solid",
  fillColor: "#dc2626",
  fillOpacity: 0.2,
};

export const useDrawStore = create<DrawStore>((set) => ({
  activeMode: null,
  features: [],
  setMode: (activeMode) => set({ activeMode }),
  setFeatures: (features) => set({ features }),
  removeFeature: (id) =>
    set((s) => ({ features: s.features.filter((f) => f.id !== id) })),
  updateFeatureStyle: (id, style) =>
    set((s) => ({
      features: s.features.map((f) =>
        f.id === id ? { ...f, style: { ...f.style, ...style } } : f
      ),
    })),
  clearAll: () => set({ features: [], activeMode: null }),
}));

export { DEFAULT_STYLE as DRAW_DEFAULT_STYLE };
