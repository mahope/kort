export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface SearchResult {
  id: string;
  text: string;
  description: string;
  coordinates: [number, number]; // [lng, lat]
  type: "address" | "place";
}

export type MapStyle = "klassisk" | "daempet" | "graa" | "moerkt";

export type BaseLayer = "skaermkort" | "ortofoto" | "osm" | "dtk25" | "historisk_hoeje" | "historisk_lave";

export type OverlayId = "contours" | "hillshade" | "stednavne" | "matrikel";

export interface OverlayState {
  id: OverlayId;
  enabled: boolean;
  opacity: number;
}
