"use client";

import { useEffect, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";

// Minimal label-free style over the Protomaps basemap schema (OSM, ODbL).
function buildStyle(archiveUrl: string): StyleSpecification {
  const src = "pm";
  return {
    version: 8,
    sources: {
      [src]: {
        type: "vector",
        url: `pmtiles://${archiveUrl}`,
        attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>',
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#f2efe9" } },
      { id: "earth", type: "fill", source: src, "source-layer": "earth", paint: { "fill-color": "#f2efe9" } },
      { id: "landuse", type: "fill", source: src, "source-layer": "landuse", paint: { "fill-color": "#cfe6b8", "fill-opacity": 0.7 } },
      { id: "natural", type: "fill", source: src, "source-layer": "natural", paint: { "fill-color": "#d6e8c4", "fill-opacity": 0.6 } },
      { id: "water", type: "fill", source: src, "source-layer": "water", paint: { "fill-color": "#9ecbe8" } },
      { id: "buildings", type: "fill", source: src, "source-layer": "buildings", minzoom: 13, paint: { "fill-color": "#c9c3b8" } },
      { id: "roads-minor", type: "line", source: src, "source-layer": "roads", filter: ["in", "kind", "minor_road", "other", "path"], paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.5, 16, 3] } },
      { id: "roads-major", type: "line", source: src, "source-layer": "roads", filter: ["in", "kind", "major_road", "highway", "medium_road"], paint: { "line-color": "#f7b05a", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 16, 6] } },
      { id: "boundaries", type: "line", source: src, "source-layer": "boundaries", paint: { "line-color": "#9a7fb8", "line-dasharray": [3, 2] } },
    ],
  };
}

export default function PocPmtilesMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState("indlæser…");

  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;
    (async () => {
      // Both libs are loaded only on this page, so the default app bundle is unchanged.
      const [{ default: maplibregl }, { Protocol }] = await Promise.all([
        import("maplibre-gl"),
        import("pmtiles"),
      ]);
      if (cancelled || !ref.current) return;
      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      const params = new URLSearchParams(window.location.search);
      const archive = params.get("src") ?? `${window.location.origin}/tiles/nsj-vector.pmtiles`;
      const z = Number(params.get("z") ?? 12);
      map = new maplibregl.Map({
        container: ref.current,
        style: buildStyle(archive),
        center: [12.3, 55.93],
        zoom: z,
        attributionControl: { compact: true },
      });
      map.on("idle", () => setInfo(`idle, zoom ${map!.getZoom().toFixed(1)}`));
      (window as unknown as { __map: unknown }).__map = map;
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return (
    <div className="relative h-screen w-screen">
      <div ref={ref} className="h-full w-full" />
      <div className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs" data-testid="status">
        PoC #39 PMTiles · {info}
      </div>
    </div>
  );
}
