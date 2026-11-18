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
import { MAP_BOUNDS, transformRequest } from "@/lib/map/styles";
import {
  getBaseMapStyle,
  getRasterBaseLayers,
  KDS_MAP_ATTRIBUTION,
  NORDIC_MAP_ATTRIBUTION,
  NORDIC_TOPO_SOURCES,
  OVERLAY_SOURCES,
  sourceZoomLimit,
  usesNordicTopo,
} from "@/lib/map/sources";
import { useMapRegion } from "@/lib/hooks/useMapRegion";
import { contourLayers, contourSourceUrl, ensurePmtilesProtocol, SCREEN_PX_PER_MM } from "@/lib/map/contours";
import { attachSoekortIcons } from "@/lib/map/soekort/icons";
import { vectorOverlayLayers, vectorOverlaySource } from "@/lib/map/vectorOverlays";
import { LakeChartPopup } from "./LakeChartPopup";
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

/** The sea chart's icons are drawn on demand; also covers a later switch to "Søkort". */
function onMapLoad(e: { target: import("maplibre-gl").Map }) {
  attachSoekortIcons(e.target, SCREEN_PX_PER_MM, window.devicePixelRatio || 1);
  collapseAttributionOnTouch(e);
}

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
  // Outside Denmark: Kartverket over OpenTopoMap instead of the Danish maps.
  const region = useMapRegion();
  const nordic = usesNordicTopo(baseLayer, region);

  // The vector sea chart reads our PMTiles through the pmtiles:// protocol.
  if (baseLayer === "soekort") ensurePmtilesProtocol();
  const mapStyle = getBaseMapStyle(baseLayer, style, nordic);
  const rasterBase = RASTER_BASE_LAYERS[baseLayer];

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
    if (!map || !rasterBase) return;
    const source = map.getSource("base-raster");
    if (source && "setTiles" in source) {
      const raster = source as import("maplibre-gl").RasterTileSource;
      // The source is created once, so its zoom limit must follow the layer too
      // (OSM stops at 19, ortofoto goes to 20); setTiles reloads with it.
      raster.maxzoom = rasterBase.maxzoom ?? 22;
      raster.setTiles(rasterBase.tiles);
    }
  }, [rasterBase]);

  // The attribution control is recreated per region (keyed below), and a new
  // compact control opens expanded: fold it again on touch, as on load.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map) collapseAttributionOnTouch({ target: map });
  }, [region]);

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
      onLoad={onMapLoad}
      mapStyle={mapStyle}
      transformRequest={transformRequest}
      maxBounds={[...MAP_BOUNDS[0], ...MAP_BOUNDS[1]]}
      attributionControl={false}
      canvasContextAttributes={{ preserveDrawingBuffer: true }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Nordic topo (OpenTopoMap, Kartverket on top). Always mounted so its
          layers stay under everything else; hidden in Denmark (no requests). */}
      {NORDIC_TOPO_SOURCES.map(({ id, cfg }) => (
        <Source
          key={id}
          id={id}
          type="raster"
          tiles={cfg.tiles}
          tileSize={cfg.tileSize}
          {...sourceZoomLimit(cfg)}
          {...(cfg.bounds ? { bounds: cfg.bounds } : {})}
          attribution={cfg.attribution}
        >
          <Layer id={`${id}-layer`} type="raster" layout={{ visibility: nordic ? "visible" : "none" }} />
        </Source>
      ))}

      {/* Raster base layer (ortofoto, dtk25, osm, historiske kort) */}
      {/* Hidden, not unmounted, outside Denmark: a remount would add it on top of the overlays. */}
      {rasterBase && (
        <Source
          id="base-raster"
          type="raster"
          tiles={rasterBase.tiles}
          tileSize={rasterBase.tileSize}
          {...sourceZoomLimit(rasterBase)}
          attribution={rasterBase.attribution}
        >
          <Layer id="base-raster-layer" type="raster" layout={{ visibility: nordic ? "none" : "visible" }} />
        </Source>
      )}

      {/* Overlays (generic loop) */}
      {overlays.filter((o) => o.enabled).map((overlay) => {
        const vector = OVERLAY_SOURCES[overlay.id].vector;
        if (vector) {
          const sourceId = `${overlay.id}-overlay`;
          return (
            <Source
              key={overlay.id}
              id={sourceId}
              {...vectorOverlaySource(vector)}
              attribution={OVERLAY_SOURCES[overlay.id].attribution}
            >
              {vectorOverlayLayers(vector, sourceId, overlay.opacity).map((layer) => (
                <Layer key={layer.id} {...layer} />
              ))}
            </Source>
          );
        }
        const interval = OVERLAY_SOURCES[overlay.id].contourInterval;
        if (interval) {
          ensurePmtilesProtocol();
          const sourceId = `${overlay.id}-overlay`;
          return (
            <Source
              key={overlay.id}
              id={sourceId}
              type="vector"
              url={contourSourceUrl()}
              attribution={OVERLAY_SOURCES[overlay.id].attribution}
            >
              {contourLayers(sourceId, interval, overlay.opacity).map((layer) => (
                <Layer key={layer.id} {...layer} />
              ))}
            </Source>
          );
        }
        return (
        <Source
          key={overlay.id}
          id={`${overlay.id}-overlay`}
          type="raster"
          tiles={OVERLAY_SOURCES[overlay.id].tiles}
          tileSize={OVERLAY_SOURCES[overlay.id].tileSize}
          {...sourceZoomLimit(OVERLAY_SOURCES[overlay.id])}
          {...(OVERLAY_SOURCES[overlay.id].bounds ? { bounds: OVERLAY_SOURCES[overlay.id].bounds } : {})}
          attribution={OVERLAY_SOURCES[overlay.id].attribution}
        >
          <Layer
            id={`${overlay.id}-overlay-layer`}
            type="raster"
            paint={{ "raster-opacity": overlay.opacity, ...OVERLAY_SOURCES[overlay.id].paint }}
          />
        </Source>
        );
      })}

      <ImportedLayers />
      {overlays.some((o) => o.id === "indsoekort" && o.enabled) && !needsDrawing && <LakeChartPopup />}
      {needsDrawing && <DrawingTools />}
      <UtmGrid />
      <PrintFrame />

      <NavigationControl position="bottom-right" />
      <ScaleControl position="bottom-right" unit="metric" />
      {/* Keyed: react-map-gl reads customAttribution only when it creates the control. */}
      <AttributionControl
        key={region}
        position="bottom-left"
        compact
        customAttribution={region === "nordic" ? NORDIC_MAP_ATTRIBUTION : KDS_MAP_ATTRIBUTION}
      />
      <GeolocationButton mapRef={mapRef} />
    </Map>
  );
}
