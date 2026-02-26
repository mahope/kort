import { create } from "zustand";
import type { MapViewState, MapStyle } from "@/types/map";
import { DENMARK_CENTER, DEFAULT_ZOOM, DEFAULT_STYLE } from "@/lib/map/styles";

interface MapStore {
  viewState: MapViewState;
  style: MapStyle;
  flyToTarget: { lng: number; lat: number; zoom: number } | null;
  setViewState: (viewState: MapViewState) => void;
  setStyle: (style: MapStyle) => void;
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
  flyToTarget: null,
  setViewState: (viewState) => set({ viewState }),
  setStyle: (style) => set({ style }),
  flyTo: (lng, lat, zoom = 14) => set({ flyToTarget: { lng, lat, zoom } }),
  clearFlyTo: () => set({ flyToTarget: null }),
}));
