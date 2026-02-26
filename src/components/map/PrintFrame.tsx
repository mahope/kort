"use client";

import { useEffect, useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { calculatePrintArea, groundExtentToBounds } from "@/lib/geo/calculations";

/**
 * Rotate a point around a center by a given angle (in degrees, clockwise).
 * Returns [lng, lat].
 */
function rotatePoint(
  lng: number,
  lat: number,
  centerLng: number,
  centerLat: number,
  angleDeg: number
): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = lng - centerLng;
  const dy = lat - centerLat;
  return [
    centerLng + dx * cos - dy * sin,
    centerLat + dx * sin + dy * cos,
  ];
}

export function PrintFrame() {
  const viewState = useMapStore((s) => s.viewState);
  const { paperFormat, orientation, scale, setFrameBounds } = usePrintStore();
  const bearing = viewState.bearing;

  const bounds = useMemo(() => {
    const area = calculatePrintArea(paperFormat, orientation, scale);
    return groundExtentToBounds(
      viewState.longitude,
      viewState.latitude,
      area.groundWidthM,
      area.groundHeightM
    );
  }, [viewState.longitude, viewState.latitude, paperFormat, orientation, scale]);

  useEffect(() => {
    setFrameBounds(bounds);
  }, [bounds, setFrameBounds]);

  // Corner points of the print area (axis-aligned)
  const corners: [number, number][] = useMemo(() => [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north],
  ], [bounds]);

  // Rotate corners by bearing around map center
  const rotatedCorners: [number, number][] = useMemo(() => {
    if (bearing === 0) return corners;
    return corners.map(([lng, lat]) =>
      rotatePoint(lng, lat, viewState.longitude, viewState.latitude, -bearing)
    );
  }, [corners, bearing, viewState.longitude, viewState.latitude]);

  // Dimming mask: large outer polygon with a hole for the print area
  const maskGeoJSON = useMemo(() => {
    const outer = [
      [-180, -90],
      [180, -90],
      [180, 90],
      [-180, 90],
      [-180, -90],
    ];
    const inner = [...rotatedCorners, rotatedCorners[0]];
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "Polygon" as const,
            coordinates: [outer, inner],
          },
        },
      ],
    };
  }, [rotatedCorners]);

  // Print frame border
  const borderGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [...rotatedCorners, rotatedCorners[0]],
          },
        },
      ],
    }),
    [rotatedCorners]
  );

  return (
    <>
      <Source id="print-mask" type="geojson" data={maskGeoJSON}>
        <Layer
          id="print-mask-fill"
          type="fill"
          paint={{
            "fill-color": "#000000",
            "fill-opacity": 0.3,
          }}
        />
      </Source>
      <Source id="print-border" type="geojson" data={borderGeoJSON}>
        <Layer
          id="print-border-line"
          type="line"
          paint={{
            "line-color": "#dc2626",
            "line-width": 2,
            "line-dasharray": [4, 3],
          }}
        />
      </Source>
    </>
  );
}
