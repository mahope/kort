"use client";

import { useEffect, useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl/maplibre";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { calculatePrintArea, groundExtentToBounds, calculateMultiPageGrid } from "@/lib/geo/calculations";

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

function boundsToCorners(bounds: { north: number; south: number; east: number; west: number }): [number, number][] {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north],
  ];
}

export function PrintFrame() {
  const viewState = useMapStore((s) => s.viewState);
  const { paperFormat, orientation, scale, setFrameBounds, multiPage, gridCols, gridRows, overlapMm } = usePrintStore();
  const bearing = viewState.bearing;

  // Single-page bounds
  const singleBounds = useMemo(() => {
    const area = calculatePrintArea(paperFormat, orientation, scale);
    return groundExtentToBounds(
      viewState.longitude,
      viewState.latitude,
      area.groundWidthM,
      area.groundHeightM
    );
  }, [viewState.longitude, viewState.latitude, paperFormat, orientation, scale]);

  // Multi-page grid
  const multiPageGrid = useMemo(() => {
    if (!multiPage) return null;
    return calculateMultiPageGrid(
      viewState.longitude,
      viewState.latitude,
      paperFormat,
      orientation,
      scale,
      overlapMm,
      gridCols,
      gridRows
    );
  }, [viewState.longitude, viewState.latitude, paperFormat, orientation, scale, multiPage, overlapMm, gridCols, gridRows]);

  const activeBounds = multiPage && multiPageGrid ? multiPageGrid.totalBounds : singleBounds;

  useEffect(() => {
    setFrameBounds(activeBounds);
  }, [activeBounds, setFrameBounds]);

  // Corner points of the active area
  const corners = useMemo(() => boundsToCorners(activeBounds), [activeBounds]);

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

  // Grid lines for multi-page
  const gridGeoJSON = useMemo(() => {
    if (!multiPage || !multiPageGrid) return null;

    const features: GeoJSON.Feature[] = [];

    // Draw internal cell borders
    for (const cell of multiPageGrid.cells) {
      const cellCorners = boundsToCorners(cell.bounds);
      const rotated = bearing === 0
        ? cellCorners
        : cellCorners.map(([lng, lat]) =>
            rotatePoint(lng, lat, viewState.longitude, viewState.latitude, -bearing)
          );
      features.push({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [...rotated, rotated[0]],
        },
      });
    }

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [multiPage, multiPageGrid, bearing, viewState.longitude, viewState.latitude]);

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

      {/* Multi-page grid lines */}
      {gridGeoJSON && (
        <Source id="print-grid" type="geojson" data={gridGeoJSON}>
          <Layer
            id="print-grid-lines"
            type="line"
            paint={{
              "line-color": "#dc2626",
              "line-width": 1,
              "line-opacity": 0.5,
              "line-dasharray": [2, 2],
            }}
          />
        </Source>
      )}

      {/* Multi-page cell labels */}
      {multiPage && multiPageGrid?.cells.map((cell) => {
        const centerLng = (cell.bounds.west + cell.bounds.east) / 2;
        const centerLat = (cell.bounds.north + cell.bounds.south) / 2;
        const [lng, lat] = bearing === 0
          ? [centerLng, centerLat]
          : rotatePoint(centerLng, centerLat, viewState.longitude, viewState.latitude, -bearing);

        return (
          <Marker key={cell.label} longitude={lng} latitude={lat} anchor="center">
            <div className="bg-accent/80 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow">
              {cell.label}
            </div>
          </Marker>
        );
      })}
    </>
  );
}
