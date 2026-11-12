"use client";

import { useCallback, useRef, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { preconnect } from "react-dom";
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
import { useUiStore } from "@/stores/uiStore";
import { useDrawStore } from "@/stores/drawStore";
import { MAP_STYLES, DENMARK_BOUNDS, transformRequest } from "@/lib/map/styles";
import { BLANK_STYLE, getRasterBaseLayers, OVERLAY_SOURCES } from "@/lib/map/sources";
import { PrintFrame } from "./PrintFrame";
import { GeolocationButton } from "./GeolocationButton";
import { ImportedLayers } from "./ImportedLayers";
import { UtmGrid } from "./UtmGrid";
import { configureMaplibreWorker } from "@/lib/map/workerUrl";

// terra-draw (~44 KB gz) is only needed once the user starts drawing or has
// persisted drawings to restore.
const DrawingTools = dynamic(
  () => import("./DrawingTools").then((mod) => mod.DrawingTools),
  { ssr: false }
);

// Static lookup — module scope so it isn't re-created per render or used as an
// effect dependency.
configureMaplibreWorker();

const RASTER_BASE_LAYERS = getRasterBaseLayers("screen");

/**
 * MapLibre opens the compact attribution on load; on phones the open text
 * runs under the zoom buttons. Start it folded (the (i) button opens it).
 */
function collapseAttributionOnTouch(e: { target: import("maplibre-gl").Map }) {
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  e.target.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
}

export function MapContainer() {
  // MapLibre fetches tiles/style with CORS, so the connection must be opened
  // with crossOrigin to be reused. Runs in an effect: this component is
  // ssr:false, so there is no server render to hoist the hint into anyway.
  useEffect(() => {
    preconnect("https://api.dataforsyningen.dk", { crossOrigin: "anonymous" });
    preconnect("https://cdn.dataforsyningen.dk", { crossOrigin: "anonymous" });
  }, []);
  const mapRef = useRef<MapRef>(null);
  const viewState = useMapStore((s) => s.viewState);
  const setViewState = useMapStore((s) => s.setViewState);
  const style = useMapStore((s) => s.style);
  const baseLayer = useMapStore((s) => s.baseLayer);
  const overlays = useMapStore((s) => s.overlays);
  const flyToTarget = useMapStore((s) => s.flyToTarget);
  const clearFlyTo = useMapStore((s) => s.clearFlyTo);
  // Below md the sheet covers the bottom of the map; padding moves the map
  // centre (and with it the print frame) into the visible part.
  const sheetPx = useUiStore((s) => s.sheetPx);
  const padding = useMemo(() => ({ top: 0, left: 0, right: 0, bottom: sheetPx }), [sheetPx]);
  const needsDrawing = useDrawStore((s) => s.activeMode !== null || s.features.length > 0);

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

  // Imperatively update raster tiles when base layer changes
  // (react-map-gl doesn't reliably diff the tiles prop on raster sources)
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || baseLayer === "skaermkort") return;
    const cfg = RASTER_BASE_LAYERS[baseLayer];
    if (!cfg) return;
    const source = map.getSource("base-raster");
    if (source && "setTiles" in source) {
      (source as import("maplibre-gl").RasterTileSource).setTiles(cfg.tiles);
    }
  }, [baseLayer]);

  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyToTarget.lng, flyToTarget.lat],
        zoom: flyToTarget.zoom,
        ...(flyToTarget.padding ? { padding: flyToTarget.padding } : {}),
        duration: 1500,
      });
      clearFlyTo();
    }
  }, [flyToTarget, clearFlyTo]);

  return (
    <Map
      ref={mapRef}
      {...viewState}
      padding={padding}
      onMove={onMove}
      onLoad={collapseAttributionOnTouch}
      mapStyle={mapStyle}
      transformRequest={transformRequest}
      maxBounds={[...DENMARK_BOUNDS[0], ...DENMARK_BOUNDS[1]]}
      attributionControl={false}
      canvasContextAttributes={{ preserveDrawingBuffer: true }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Raster base layer (ortofoto, dtk25, osm, historiske kort) */}
      {baseLayer !== "skaermkort" && RASTER_BASE_LAYERS[baseLayer] && (
        <Source
          id="base-raster"
          type="raster"
          tiles={RASTER_BASE_LAYERS[baseLayer].tiles}
          tileSize={RASTER_BASE_LAYERS[baseLayer].tileSize}
          attribution={RASTER_BASE_LAYERS[baseLayer].attribution}
        >
          <Layer id="base-raster-layer" type="raster" />
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
          attribution={OVERLAY_SOURCES[overlay.id].attribution}
        >
          <Layer
            id={`${overlay.id}-overlay-layer`}
            type="raster"
            paint={{ "raster-opacity": overlay.opacity, ...OVERLAY_SOURCES[overlay.id].paint }}
          />
        </Source>
      ))}

      <ImportedLayers />
      {needsDrawing && <DrawingTools />}
      <UtmGrid />
      <PrintFrame />

      <NavigationControl position="bottom-right" />
      <ScaleControl position="bottom-right" unit="metric" />
      <AttributionControl
        position="bottom-left"
        compact
        customAttribution="&copy; Klimadatastyrelsen"
      />
      <GeolocationButton mapRef={mapRef} />
    </Map>
  );
}
