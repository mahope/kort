import { create } from "zustand";

export interface LayerStyle {
  lineColor: string;
  lineWidth: number;
  lineStyle: "solid" | "dashed" | "dotted";
  fillColor: string;
  fillOpacity: number;
}

export interface ImportedLayer {
  id: string;
  name: string;
  geojson: GeoJSON.FeatureCollection;
  visible: boolean;
  style: LayerStyle;
}

interface ImportStore {
  layers: ImportedLayer[];
  addLayer: (layer: ImportedLayer) => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  updateLayerStyle: (id: string, style: Partial<LayerStyle>) => void;
}

export const useImportStore = create<ImportStore>((set) => ({
  layers: [],
  addLayer: (layer) =>
    set((s) => ({ layers: [...s.layers, layer] })),
  removeLayer: (id) =>
    set((s) => ({ layers: s.layers.filter((l) => l.id !== id) })),
  toggleLayerVisibility: (id) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    })),
  updateLayerStyle: (id, style) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, style: { ...l.style, ...style } } : l
      ),
    })),
}));
