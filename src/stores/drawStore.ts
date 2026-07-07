import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  /** Undo/redo snapshot stacks (feature id-set changes only). */
  past: DrawnFeature[][];
  future: DrawnFeature[][];
  /** Bumped only by undo/redo so DrawingTools re-syncs Terra Draw to the store. */
  commitRevision: number;
  setMode: (mode: DrawMode) => void;
  setFeatures: (features: DrawnFeature[]) => void;
  removeFeature: (id: string) => void;
  updateFeatureStyle: (id: string, style: Partial<LayerStyle>) => void;
  renameFeature: (id: string, name: string) => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
}

const HISTORY_LIMIT = 40;
const idSet = (fs: DrawnFeature[]) => fs.map((f) => f.id).join(",");

const DEFAULT_STYLE: LayerStyle = {
  lineColor: "#dc2626",
  lineWidth: 3,
  lineStyle: "solid",
  fillColor: "#dc2626",
  fillOpacity: 0.2,
};

export const useDrawStore = create<DrawStore>()(
  persist(
    (set) => ({
      activeMode: null,
      features: [],
      past: [],
      future: [],
      commitRevision: 0,
      setMode: (activeMode) => set({ activeMode }),
      setFeatures: (features) =>
        set((s) => {
          // Record history only when the set of features changes (add/remove);
          // vertex/style tweaks update in place without a new undo step.
          if (idSet(features) !== idSet(s.features)) {
            return {
              features,
              past: [...s.past.slice(-(HISTORY_LIMIT - 1)), s.features],
              future: [],
            };
          }
          return { features };
        }),
      removeFeature: (id) =>
        set((s) => ({
          features: s.features.filter((f) => f.id !== id),
          past: [...s.past.slice(-(HISTORY_LIMIT - 1)), s.features],
          future: [],
        })),
      updateFeatureStyle: (id, style) =>
        set((s) => ({
          features: s.features.map((f) =>
            f.id === id ? { ...f, style: { ...f.style, ...style } } : f
          ),
        })),
      renameFeature: (id, name) =>
        set((s) => ({
          features: s.features.map((f) =>
            f.id === id
              ? {
                  ...f,
                  geojson: {
                    ...f.geojson,
                    properties: { ...(f.geojson.properties ?? {}), name },
                  },
                }
              : f
          ),
        })),
      undo: () =>
        set((s) => {
          if (s.past.length === 0) return s;
          const prev = s.past[s.past.length - 1];
          return {
            features: prev,
            past: s.past.slice(0, -1),
            future: [s.features, ...s.future].slice(0, HISTORY_LIMIT),
            commitRevision: s.commitRevision + 1,
          };
        }),
      redo: () =>
        set((s) => {
          if (s.future.length === 0) return s;
          const next = s.future[0];
          return {
            features: next,
            future: s.future.slice(1),
            past: [...s.past.slice(-(HISTORY_LIMIT - 1)), s.features],
            commitRevision: s.commitRevision + 1,
          };
        }),
      clearAll: () =>
        set((s) => ({
          features: [],
          activeMode: null,
          past: s.features.length
            ? [...s.past.slice(-(HISTORY_LIMIT - 1)), s.features]
            : s.past,
          future: [],
          commitRevision: s.commitRevision + 1,
        })),
    }),
    {
      name: "kort-drawings",
      version: 1,
      // Persist only the drawn features; the active tool resets on reload.
      // DrawingTools re-adds these to Terra Draw on the initial style.load.
      partialize: (s) => ({ features: s.features }),
    }
  )
);

export { DEFAULT_STYLE as DRAW_DEFAULT_STYLE };
