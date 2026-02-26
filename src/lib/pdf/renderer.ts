import maplibregl from "maplibre-gl";
import type { PrintFrameBounds } from "@/types/print";
import type { MapStyle, BaseLayer, OverlayState } from "@/types/map";
import type { ImportedLayer } from "@/stores/importStore";
import type { DrawnFeature } from "@/stores/drawStore";
import { MAP_STYLES, transformRequest } from "@/lib/map/styles";
import { BLANK_STYLE, ORTOFOTO_SOURCE, OSM_SOURCE, DTK25_SOURCE, HISTORISK_HOEJE_SOURCE, HISTORISK_LAVE_SOURCE, OVERLAY_SOURCES } from "@/lib/map/sources";
import type { RasterSourceConfig } from "@/lib/map/sources";
import { latlngToUtm, utmToLatlng, getGridInterval } from "@/lib/geo/utm";

function getDashArray(lineStyle: string): number[] | undefined {
  switch (lineStyle) {
    case "dashed": return [4, 3];
    case "dotted": return [1, 2];
    default: return undefined;
  }
}

interface RenderOptions {
  bounds: PrintFrameBounds;
  canvasWidth: number;
  canvasHeight: number;
  style: MapStyle;
  baseLayer: BaseLayer;
  overlays: OverlayState[];
  importedLayers?: ImportedLayer[];
  drawnFeatures?: DrawnFeature[];
  showUtmGrid?: boolean;
  scale?: number;
  bearing?: number;
}

export async function renderMapToCanvas({
  bounds,
  canvasWidth,
  canvasHeight,
  style,
  baseLayer,
  overlays,
  importedLayers = [],
  drawnFeatures = [],
  showUtmGrid = false,
  scale = 25000,
  bearing = 0,
}: RenderOptions): Promise<HTMLCanvasElement> {
  // Create hidden container at target resolution
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = `${canvasWidth}px`;
  container.style.height = `${canvasHeight}px`;
  document.body.appendChild(container);

  try {
    const mapStyle = baseLayer === "skaermkort" ? MAP_STYLES[style].url : BLANK_STYLE;

    const RASTER_BASE_LAYERS: Record<string, RasterSourceConfig> = {
      ortofoto: ORTOFOTO_SOURCE,
      dtk25: DTK25_SOURCE,
      osm: OSM_SOURCE,
      historisk_hoeje: HISTORISK_HOEJE_SOURCE,
      historisk_lave: HISTORISK_LAVE_SOURCE,
    };

    const centerLng = (bounds.west + bounds.east) / 2;
    const centerLat = (bounds.north + bounds.south) / 2;

    const mapOptions: maplibregl.MapOptions = {
      container,
      style: mapStyle,
      transformRequest,
      interactive: false,
      attributionControl: false,
      pixelRatio: 1,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    };

    if (bearing !== 0) {
      // With bearing, use center/zoom instead of bounds
      // Calculate zoom from scale: at equator, 1 tile (256px) = 40075016.686m / 2^zoom
      // At a given latitude, ground resolution = (cos(lat) * 40075016.686) / (256 * 2^zoom)
      // We need: canvasWidth px = groundWidth m, so zoom = log2(cos(lat) * 40075016.686 * canvasWidth / (256 * groundWidth))
      const groundWidthM = bounds.east - bounds.west;
      const latRad = (centerLat * Math.PI) / 180;
      const metersPerDegreeLng = 111320 * Math.cos(latRad);
      const groundWidthMeters = groundWidthM * metersPerDegreeLng;
      const groundResolution = groundWidthMeters / canvasWidth; // meters per pixel
      const zoom = Math.log2((Math.cos(latRad) * 40075016.686) / (256 * groundResolution));

      mapOptions.center = [centerLng, centerLat];
      mapOptions.zoom = zoom;
      mapOptions.bearing = bearing;
    } else {
      mapOptions.bounds = [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ];
      mapOptions.fitBoundsOptions = { padding: 0 };
    }

    const map = new maplibregl.Map(mapOptions);

    await waitForMapLoad(map);

    // Add raster base layer if not skaermkort
    const rasterSource = RASTER_BASE_LAYERS[baseLayer];
    if (rasterSource) {
      map.addSource(`base-${baseLayer}`, {
        type: "raster",
        tiles: rasterSource.tiles,
        tileSize: rasterSource.tileSize,
      });
      map.addLayer({ id: `base-${baseLayer}-layer`, type: "raster", source: `base-${baseLayer}` });
    }

    // Add active overlays
    const activeOverlays = overlays.filter((o) => o.enabled);
    for (const overlay of activeOverlays) {
      const sourceConfig = OVERLAY_SOURCES[overlay.id];
      const sourceId = `${overlay.id}-overlay`;
      map.addSource(sourceId, {
        type: "raster",
        tiles: sourceConfig.tiles,
        tileSize: sourceConfig.tileSize,
      });
      map.addLayer({
        id: `${sourceId}-layer`,
        type: "raster",
        source: sourceId,
        paint: { "raster-opacity": overlay.opacity },
      });
    }

    // Add imported layers
    for (const layer of importedLayers.filter((l) => l.visible)) {
      const sourceId = `pdf-import-${layer.id}`;
      map.addSource(sourceId, { type: "geojson", data: layer.geojson });
      map.addLayer({
        id: `${sourceId}-fill`,
        type: "fill",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": layer.style.fillColor,
          "fill-opacity": layer.style.fillOpacity,
        },
      });
      const dash = getDashArray(layer.style.lineStyle);
      map.addLayer({
        id: `${sourceId}-line`,
        type: "line",
        source: sourceId,
        filter: ["any", ["==", ["geometry-type"], "LineString"], ["==", ["geometry-type"], "Polygon"]],
        paint: {
          "line-color": layer.style.lineColor,
          "line-width": layer.style.lineWidth,
          ...(dash ? { "line-dasharray": dash } : {}),
        },
      });
      map.addLayer({
        id: `${sourceId}-point`,
        type: "circle",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": layer.style.fillColor,
          "circle-radius": layer.style.lineWidth + 2,
          "circle-stroke-color": layer.style.lineColor,
          "circle-stroke-width": 2,
        },
      });
    }

    // Add drawn features
    if (drawnFeatures.length > 0) {
      const drawnGeoJSON: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: drawnFeatures.map((f) => f.geojson),
      };
      map.addSource("pdf-drawn", { type: "geojson", data: drawnGeoJSON });
      const ds = drawnFeatures[0]?.style;
      if (ds) {
        map.addLayer({
          id: "pdf-drawn-fill",
          type: "fill",
          source: "pdf-drawn",
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: { "fill-color": ds.fillColor, "fill-opacity": ds.fillOpacity },
        });
        map.addLayer({
          id: "pdf-drawn-line",
          type: "line",
          source: "pdf-drawn",
          filter: ["any", ["==", ["geometry-type"], "LineString"], ["==", ["geometry-type"], "Polygon"]],
          paint: { "line-color": ds.lineColor, "line-width": ds.lineWidth },
        });
        map.addLayer({
          id: "pdf-drawn-point",
          type: "circle",
          source: "pdf-drawn",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-color": ds.fillColor,
            "circle-radius": ds.lineWidth + 2,
            "circle-stroke-color": ds.lineColor,
            "circle-stroke-width": 2,
          },
        });
      }
    }

    // Add UTM grid lines on the map canvas
    if (showUtmGrid) {
      const zone = Math.floor((centerLng + 180) / 6) + 1;
      const interval = getGridInterval(scale);

      const sw = latlngToUtm(bounds.south, bounds.west, zone);
      const ne = latlngToUtm(bounds.north, bounds.east, zone);

      const minE = Math.floor(sw.easting / interval) * interval;
      const maxE = Math.ceil(ne.easting / interval) * interval;
      const minN = Math.floor(sw.northing / interval) * interval;
      const maxN = Math.ceil(ne.northing / interval) * interval;

      const gridFeatures: GeoJSON.Feature[] = [];

      // Vertical lines (constant easting)
      for (let e = minE; e <= maxE; e += interval) {
        const coords: [number, number][] = [];
        for (let n = minN; n <= maxN; n += interval / 4) {
          const ll = utmToLatlng(e, n, zone);
          coords.push([ll.lng, ll.lat]);
        }
        if (coords.length >= 2) {
          gridFeatures.push({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          });
        }
      }

      // Horizontal lines (constant northing)
      for (let n = minN; n <= maxN; n += interval) {
        const coords: [number, number][] = [];
        for (let e = minE; e <= maxE; e += interval / 4) {
          const ll = utmToLatlng(e, n, zone);
          coords.push([ll.lng, ll.lat]);
        }
        if (coords.length >= 2) {
          gridFeatures.push({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          });
        }
      }

      map.addSource("pdf-utm-grid", {
        type: "geojson",
        data: { type: "FeatureCollection", features: gridFeatures },
      });
      map.addLayer({
        id: "pdf-utm-grid-lines",
        type: "line",
        source: "pdf-utm-grid",
        paint: {
          "line-color": "#1e40af",
          "line-width": 0.8,
          "line-opacity": 0.5,
        },
      });
    }

    // Wait for all tiles (including raster overlays) to load
    await waitForTilesLoaded(map);

    const canvas = map.getCanvas();

    // Clone canvas data before cleanup
    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    const ctx = resultCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(canvas, 0, 0);
    }

    map.remove();
    return resultCanvas;
  } finally {
    document.body.removeChild(container);
  }
}

function waitForMapLoad(map: maplibregl.Map): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Kort-rendering timeout (60s)"));
    }, 60000);

    map.once("load", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function waitForTilesLoaded(map: maplibregl.Map): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Tile-loading timeout (60s)"));
    }, 60000);

    const checkInterval = setInterval(() => {
      if (map.isStyleLoaded() && map.areTilesLoaded()) {
        clearInterval(checkInterval);
        // Extra delay for final render
        setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, 500);
      }
    }, 100);
  });
}
