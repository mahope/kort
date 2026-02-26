"use client";

import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { latlngToUtm, utmToLatlng, getGridInterval } from "@/lib/geo/utm";

export function UtmGrid() {
  const showGrid = useMapStore((s) => s.showUtmGrid);
  const viewState = useMapStore((s) => s.viewState);
  const scale = usePrintStore((s) => s.scale);
  const frameBounds = usePrintStore((s) => s.frameBounds);

  const gridData = useMemo(() => {
    if (!showGrid || !frameBounds) return null;

    // Use print frame bounds with some padding
    const { north, south, east, west } = frameBounds;
    const zone = Math.floor((viewState.longitude + 180) / 6) + 1;
    const interval = getGridInterval(scale);

    // Convert corners to UTM
    const sw = latlngToUtm(south, west, zone);
    const ne = latlngToUtm(north, east, zone);

    // Round to grid interval
    const minE = Math.floor(sw.easting / interval) * interval;
    const maxE = Math.ceil(ne.easting / interval) * interval;
    const minN = Math.floor(sw.northing / interval) * interval;
    const maxN = Math.ceil(ne.northing / interval) * interval;

    const features: GeoJSON.Feature[] = [];

    // Vertical lines (constant easting)
    for (let e = minE; e <= maxE; e += interval) {
      const coords: [number, number][] = [];
      // Sample points along the line for curvature
      for (let n = minN; n <= maxN; n += interval / 4) {
        const ll = utmToLatlng(e, n, zone);
        coords.push([ll.lng, ll.lat]);
      }
      if (coords.length >= 2) {
        features.push({
          type: "Feature",
          properties: { type: "easting", value: e, label: `${Math.round(e / 1000)}` },
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
        features.push({
          type: "Feature",
          properties: { type: "northing", value: n, label: `${Math.round(n / 1000)}` },
          geometry: { type: "LineString", coordinates: coords },
        });
      }
    }

    // Label points at grid intersections (edges only)
    // Bottom edge labels (easting)
    for (let e = minE; e <= maxE; e += interval) {
      const ll = utmToLatlng(e, minN, zone);
      features.push({
        type: "Feature",
        properties: {
          type: "label-easting",
          label: `${Math.round(e / 1000)}`,
        },
        geometry: { type: "Point", coordinates: [ll.lng, ll.lat] },
      });
    }

    // Left edge labels (northing)
    for (let n = minN; n <= maxN; n += interval) {
      const ll = utmToLatlng(minE, n, zone);
      features.push({
        type: "Feature",
        properties: {
          type: "label-northing",
          label: `${Math.round(n / 1000)}`,
        },
        geometry: { type: "Point", coordinates: [ll.lng, ll.lat] },
      });
    }

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [showGrid, frameBounds, viewState.longitude, scale]);

  if (!showGrid || !gridData) return null;

  return (
    <Source id="utm-grid" type="geojson" data={gridData}>
      <Layer
        id="utm-grid-lines"
        type="line"
        filter={["any", ["==", ["get", "type"], "easting"], ["==", ["get", "type"], "northing"]]}
        paint={{
          "line-color": "#1e40af",
          "line-width": 0.8,
          "line-opacity": 0.5,
        }}
      />
      <Layer
        id="utm-grid-labels"
        type="symbol"
        filter={["any",
          ["==", ["get", "type"], "label-easting"],
          ["==", ["get", "type"], "label-northing"],
        ]}
        layout={{
          "text-field": ["get", "label"],
          "text-size": 10,
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-anchor": "center",
          "text-allow-overlap": true,
        }}
        paint={{
          "text-color": "#1e40af",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
          "text-opacity": 0.8,
        }}
      />
    </Source>
  );
}
