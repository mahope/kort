"use client";

import { useEffect, useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { calculatePrintArea, groundExtentToBounds } from "@/lib/geo/calculations";

export function PrintFrame() {
  const viewState = useMapStore((s) => s.viewState);
  const { paperFormat, orientation, scale, setFrameBounds } = usePrintStore();

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

  // Dimming mask: large outer polygon with a hole for the print area
  const maskGeoJSON = useMemo(() => {
    const outer = [
      [-180, -90],
      [180, -90],
      [180, 90],
      [-180, 90],
      [-180, -90],
    ];
    const inner = [
      [bounds.west, bounds.south],
      [bounds.east, bounds.south],
      [bounds.east, bounds.north],
      [bounds.west, bounds.north],
      [bounds.west, bounds.south],
    ];
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
  }, [bounds]);

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
            coordinates: [
              [bounds.west, bounds.south],
              [bounds.east, bounds.south],
              [bounds.east, bounds.north],
              [bounds.west, bounds.north],
              [bounds.west, bounds.south],
            ],
          },
        },
      ],
    }),
    [bounds]
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
