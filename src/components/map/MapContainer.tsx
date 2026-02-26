"use client";

import { useCallback, useRef, useEffect } from "react";
import Map, {
  NavigationControl,
  ScaleControl,
  AttributionControl,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import { useMapStore } from "@/stores/mapStore";
import { MAP_STYLES, DENMARK_BOUNDS, transformRequest } from "@/lib/map/styles";
import { PrintFrame } from "./PrintFrame";

export function MapContainer() {
  const mapRef = useRef<MapRef>(null);
  const viewState = useMapStore((s) => s.viewState);
  const setViewState = useMapStore((s) => s.setViewState);
  const style = useMapStore((s) => s.style);
  const flyToTarget = useMapStore((s) => s.flyToTarget);
  const clearFlyTo = useMapStore((s) => s.clearFlyTo);

  const onMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      setViewState({
        longitude: evt.viewState.longitude,
        latitude: evt.viewState.latitude,
        zoom: evt.viewState.zoom,
        bearing: evt.viewState.bearing ?? 0,
        pitch: evt.viewState.pitch ?? 0,
      });
    },
    [setViewState]
  );

  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyToTarget.lng, flyToTarget.lat],
        zoom: flyToTarget.zoom,
        duration: 1500,
      });
      clearFlyTo();
    }
  }, [flyToTarget, clearFlyTo]);

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={onMove}
      mapStyle={MAP_STYLES[style].url}
      transformRequest={transformRequest}
      maxBounds={DENMARK_BOUNDS as [[number, number], [number, number]]}
      attributionControl={false}
      canvasContextAttributes={{ preserveDrawingBuffer: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="bottom-right" />
      <ScaleControl position="bottom-right" unit="metric" />
      <AttributionControl
        position="bottom-left"
        customAttribution="&copy; Klimadatastyrelsen"
      />
      <PrintFrame />
    </Map>
  );
}
