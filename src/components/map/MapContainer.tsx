"use client";

import { useCallback, useRef, useEffect, useMemo } from "react";
import Map, {
  NavigationControl,
  ScaleControl,
  AttributionControl,
  Source,
  Layer,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import { useMapStore } from "@/stores/mapStore";
import { MAP_STYLES, DENMARK_BOUNDS, transformRequest } from "@/lib/map/styles";
import { BLANK_STYLE, ORTOFOTO_SOURCE, OSM_SOURCE, DTK25_SOURCE, HISTORISK_HOEJE_SOURCE, HISTORISK_LAVE_SOURCE, OVERLAY_SOURCES } from "@/lib/map/sources";
import type { BaseLayer } from "@/types/map";
import { PrintFrame } from "./PrintFrame";
import { GeolocationButton } from "./GeolocationButton";
import { ImportedLayers } from "./ImportedLayers";
import { DrawingTools } from "./DrawingTools";
import { UtmGrid } from "./UtmGrid";

export function MapContainer() {
  const mapRef = useRef<MapRef>(null);
  const viewState = useMapStore((s) => s.viewState);
  const setViewState = useMapStore((s) => s.setViewState);
  const style = useMapStore((s) => s.style);
  const baseLayer = useMapStore((s) => s.baseLayer);
  const overlays = useMapStore((s) => s.overlays);
  const flyToTarget = useMapStore((s) => s.flyToTarget);
  const clearFlyTo = useMapStore((s) => s.clearFlyTo);

  const RASTER_BASE_LAYERS: Record<string, typeof ORTOFOTO_SOURCE> = useMemo(() => ({
    ortofoto: ORTOFOTO_SOURCE,
    dtk25: DTK25_SOURCE,
    osm: OSM_SOURCE,
    historisk_hoeje: HISTORISK_HOEJE_SOURCE,
    historisk_lave: HISTORISK_LAVE_SOURCE,
  }), []);

  const mapStyle = useMemo(() => {
    if (baseLayer !== "skaermkort") return BLANK_STYLE;
    return MAP_STYLES[style].url;
  }, [baseLayer, style]);

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
      mapStyle={mapStyle}
      transformRequest={transformRequest}
      maxBounds={DENMARK_BOUNDS as [[number, number], [number, number]]}
      attributionControl={false}
      canvasContextAttributes={{ preserveDrawingBuffer: true }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Raster base layer (ortofoto, dtk25, osm, historiske kort) */}
      {baseLayer !== "skaermkort" && RASTER_BASE_LAYERS[baseLayer] && (
        <Source
          id={`base-${baseLayer}`}
          type="raster"
          tiles={RASTER_BASE_LAYERS[baseLayer].tiles}
          tileSize={RASTER_BASE_LAYERS[baseLayer].tileSize}
          attribution={RASTER_BASE_LAYERS[baseLayer].attribution}
        >
          <Layer id={`base-${baseLayer}-layer`} type="raster" />
        </Source>
      )}

      {/* Overlays (generic loop) */}
      {overlays.filter((o) => o.enabled).map((overlay) => (
        <Source
          key={overlay.id}
          id={`${overlay.id}-overlay`}
          type="raster"
          tiles={OVERLAY_SOURCES[overlay.id].tiles}
          tileSize={OVERLAY_SOURCES[overlay.id].tileSize}
        >
          <Layer
            id={`${overlay.id}-overlay-layer`}
            type="raster"
            paint={{ "raster-opacity": overlay.opacity }}
          />
        </Source>
      ))}

      <ImportedLayers />
      <DrawingTools />
      <UtmGrid />
      <PrintFrame />

      <NavigationControl position="bottom-right" />
      <ScaleControl position="bottom-right" unit="metric" />
      <AttributionControl
        position="bottom-left"
        customAttribution="&copy; Klimadatastyrelsen"
      />
      <GeolocationButton mapRef={mapRef} />
    </Map>
  );
}
