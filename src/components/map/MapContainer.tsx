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
import { BLANK_STYLE, ORTOFOTO_SOURCE, OSM_SOURCE, DTK25_SOURCE, OVERLAY_SOURCES } from "@/lib/map/sources";
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

  const mapStyle = useMemo(() => {
    if (baseLayer === "ortofoto" || baseLayer === "osm" || baseLayer === "dtk25") return BLANK_STYLE;
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

  const hillshadeOverlay = overlays.find((o) => o.id === "hillshade");
  const contoursOverlay = overlays.find((o) => o.id === "contours");

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
      {/* Ortofoto base layer */}
      {baseLayer === "ortofoto" && (
        <Source
          id="ortofoto"
          type="raster"
          tiles={ORTOFOTO_SOURCE.tiles}
          tileSize={ORTOFOTO_SOURCE.tileSize}
          attribution={ORTOFOTO_SOURCE.attribution}
        >
          <Layer id="ortofoto-layer" type="raster" />
        </Source>
      )}

      {/* DTK25 (topografisk kort 1:25.000) base layer */}
      {baseLayer === "dtk25" && (
        <Source
          id="dtk25"
          type="raster"
          tiles={DTK25_SOURCE.tiles}
          tileSize={DTK25_SOURCE.tileSize}
          attribution={DTK25_SOURCE.attribution}
        >
          <Layer id="dtk25-layer" type="raster" />
        </Source>
      )}

      {/* OpenStreetMap base layer */}
      {baseLayer === "osm" && (
        <Source
          id="osm"
          type="raster"
          tiles={OSM_SOURCE.tiles}
          tileSize={OSM_SOURCE.tileSize}
          attribution={OSM_SOURCE.attribution}
        >
          <Layer id="osm-layer" type="raster" />
        </Source>
      )}

      {/* Hillshade overlay (rendered below contours) */}
      {hillshadeOverlay?.enabled && (
        <Source
          id="hillshade-overlay"
          type="raster"
          tiles={OVERLAY_SOURCES.hillshade.tiles}
          tileSize={OVERLAY_SOURCES.hillshade.tileSize}
        >
          <Layer
            id="hillshade-overlay-layer"
            type="raster"
            paint={{ "raster-opacity": hillshadeOverlay.opacity }}
          />
        </Source>
      )}

      {/* Contours overlay */}
      {contoursOverlay?.enabled && (
        <Source
          id="contours-overlay"
          type="raster"
          tiles={OVERLAY_SOURCES.contours.tiles}
          tileSize={OVERLAY_SOURCES.contours.tileSize}
        >
          <Layer
            id="contours-overlay-layer"
            type="raster"
            paint={{ "raster-opacity": contoursOverlay.opacity }}
          />
        </Source>
      )}

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
