import { create } from "zustand";
import type { MapViewState, MapStyle, BaseLayer, OverlayId, OverlayState } from "@/types/map";
import { DENMARK_CENTER, DEFAULT_ZOOM, DEFAULT_STYLE } from "@/lib/map/styles";

const DEFAULT_OVERLAYS: OverlayState[] = [
  { id: "contours", enabled: false, opacity: 1 },
  { id: "hillshade", enabled: false, opacity: 0.5 },
];

interface MapStore {
  viewState: MapViewState;
  style: MapStyle;
  baseLayer: BaseLayer;
  overlays: OverlayState[];
  showUtmGrid: boolean;
  flyToTarget: { lng: number; lat: number; zoom: number } | null;
  setViewState: (viewState: MapViewState) => void;
  setStyle: (style: MapStyle) => void;
  setBaseLayer: (baseLayer: BaseLayer) => void;
  toggleOverlay: (id: OverlayId) => void;
  setOverlayOpacity: (id: OverlayId, opacity: number) => void;
  toggleUtmGrid: () => void;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  clearFlyTo: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  viewState: {
    longitude: DENMARK_CENTER[0],
    latitude: DENMARK_CENTER[1],
    zoom: DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
  },
  style: DEFAULT_STYLE,
  baseLayer: "dtk25",
  overlays: DEFAULT_OVERLAYS,
  showUtmGrid: false,
  flyToTarget: null,
  setViewState: (viewState) => set({ viewState }),
  setStyle: (style) => set({ style }),
  setBaseLayer: (baseLayer) => set({ baseLayer }),
  toggleOverlay: (id) =>
    set((s) => ({
      overlays: s.overlays.map((o) =>
        o.id === id ? { ...o, enabled: !o.enabled } : o
      ),
    })),
  setOverlayOpacity: (id, opacity) =>
    set((s) => ({
      overlays: s.overlays.map((o) =>
        o.id === id ? { ...o, opacity } : o
      ),
    })),
  toggleUtmGrid: () => set((s) => ({ showUtmGrid: !s.showUtmGrid })),
  flyTo: (lng, lat, zoom = 14) => set({ flyToTarget: { lng, lat, zoom } }),
  clearFlyTo: () => set({ flyToTarget: null }),
}));
