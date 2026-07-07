export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

/** Deferred coordinate lookup for Adressevælger results (search returns no coords). */
export type AddressLookup =
  | { kind: "husnummer"; id: string }
  | { kind: "adresse"; id: string }
  | { kind: "vej"; vejnavn: string; postnr: string };

export interface SearchResult {
  id: string;
  text: string;
  description: string;
  coordinates: [number, number] | null; // [lng, lat]; null until resolved via lookup
  type: "address" | "place";
  lookup?: AddressLookup;
}

export type MapStyle = "klassisk" | "daempet" | "graa" | "moerkt";

export type BaseLayer = "skaermkort" | "ortofoto" | "osm" | "dtk25" | "historisk_hoeje" | "historisk_lave";

export type OverlayId = "contours" | "hillshade" | "stednavne" | "matrikel";

export interface OverlayState {
  id: OverlayId;
  enabled: boolean;
  opacity: number;
}
