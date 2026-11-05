import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GridSystem } from "@/lib/geo/coordinates";
import type { MapViewState, MapStyle, BaseLayer, OverlayId, OverlayState } from "@/types/map";
import { DENMARK_CENTER, DEFAULT_ZOOM, DEFAULT_STYLE } from "@/lib/map/styles";
import type { GridSpacing, GridLabelFormat, UtmZoneMode } from "@/lib/geo/utmGrid";

const DEFAULT_OVERLAYS: OverlayState[] = [
  { id: "contours", enabled: false, opacity: 1 },
  { id: "hillshade", enabled: false, opacity: 0.5 },
  { id: "stednavne", enabled: false, opacity: 1 },
  { id: "matrikel", enabled: false, opacity: 1 },
];

interface MapStore {
  viewState: MapViewState;
  style: MapStyle;
  baseLayer: BaseLayer;
  overlays: OverlayState[];
  showUtmGrid: boolean;
  gridSystem: GridSystem;
  setGridSystem: (system: GridSystem) => void;
  gridSpacing: GridSpacing;
  showGridLabels: boolean;
  gridLabelFormat: GridLabelFormat;
  utmZoneMode: UtmZoneMode;
  flyToTarget: { lng: number; lat: number; zoom: number } | null;
  setViewState: (viewState: MapViewState) => void;
  setStyle: (style: MapStyle) => void;
  setBaseLayer: (baseLayer: BaseLayer) => void;
  toggleOverlay: (id: OverlayId) => void;
  setOverlayEnabled: (id: OverlayId, enabled: boolean) => void;
  setOverlayOpacity: (id: OverlayId, opacity: number) => void;
  toggleUtmGrid: () => void;
  setShowUtmGrid: (show: boolean) => void;
  setGridSpacing: (spacing: GridSpacing) => void;
  setShowGridLabels: (show: boolean) => void;
  setGridLabelFormat: (format: GridLabelFormat) => void;
  setUtmZoneMode: (mode: UtmZoneMode) => void;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  clearFlyTo: () => void;
}

export const useMapStore = create<MapStore>()(persist((set) => ({
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
  gridSystem: "utm",
  setGridSystem: (gridSystem) => set({ gridSystem }),
  gridSpacing: "auto",
  showGridLabels: true,
  gridLabelFormat: "short",
  utmZoneMode: "dk",
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
  setOverlayEnabled: (id, enabled) =>
    set((s) => ({
      overlays: s.overlays.map((o) =>
        o.id === id ? { ...o, enabled } : o
      ),
    })),
  setOverlayOpacity: (id, opacity) =>
    set((s) => ({
      overlays: s.overlays.map((o) =>
        o.id === id ? { ...o, opacity } : o
      ),
    })),
  toggleUtmGrid: () => set((s) => ({ showUtmGrid: !s.showUtmGrid })),
  setShowUtmGrid: (showUtmGrid) => set({ showUtmGrid }),
  setGridSpacing: (gridSpacing) => set({ gridSpacing }),
  setShowGridLabels: (showGridLabels) => set({ showGridLabels }),
  setGridLabelFormat: (gridLabelFormat) => set({ gridLabelFormat }),
  setUtmZoneMode: (utmZoneMode) => set({ utmZoneMode }),
  flyTo: (lng, lat, zoom = 14) => set({ flyToTarget: { lng, lat, zoom } }),
  clearFlyTo: () => set({ flyToTarget: null }),
}), { name: "kort-grid", partialize: (s) => ({ gridSystem: s.gridSystem }) }));
