"use client";

import { Source, Layer } from "react-map-gl/maplibre";
import { useImportStore } from "@/stores/importStore";
import type { LayerStyle } from "@/stores/importStore";

function getDashArray(lineStyle: LayerStyle["lineStyle"]): number[] | undefined {
  switch (lineStyle) {
    case "dashed":
      return [4, 3];
    case "dotted":
      return [1, 2];
    default:
      return undefined;
  }
}

export function ImportedLayers() {
  const layers = useImportStore((s) => s.layers);

  return (
    <>
      {layers
        .filter((l) => l.visible)
        .map((layer) => (
          <Source
            key={layer.id}
            id={`import-${layer.id}`}
            type="geojson"
            data={layer.geojson}
          >
            {/* Fill for polygons */}
            <Layer
              id={`import-fill-${layer.id}`}
              type="fill"
              filter={["==", ["geometry-type"], "Polygon"]}
              paint={{
                "fill-color": layer.style.fillColor,
                "fill-opacity": layer.style.fillOpacity,
              }}
            />
            {/* Lines */}
            <Layer
              id={`import-line-${layer.id}`}
              type="line"
              filter={["any",
                ["==", ["geometry-type"], "LineString"],
                ["==", ["geometry-type"], "Polygon"],
              ]}
              paint={{
                "line-color": layer.style.lineColor,
                "line-width": layer.style.lineWidth,
                ...(getDashArray(layer.style.lineStyle)
                  ? { "line-dasharray": getDashArray(layer.style.lineStyle)! as unknown as number[] }
                  : {}),
              }}
            />
            {/* Points */}
            <Layer
              id={`import-point-${layer.id}`}
              type="circle"
              filter={["==", ["geometry-type"], "Point"]}
              paint={{
                "circle-color": layer.style.fillColor,
                "circle-radius": layer.style.lineWidth + 2,
                "circle-stroke-color": layer.style.lineColor,
                "circle-stroke-width": 2,
              }}
            />
          </Source>
        ))}
    </>
  );
}
