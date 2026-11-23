"use client";

import { useEffect, useState } from "react";
import { Layer, Source, useMap } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";
import { ensurePmtilesProtocol } from "@/lib/map/contours";
import { OVERLAY_SOURCES } from "@/lib/map/sources";
import {
  SOEKORT_URL,
  soekortAnchors,
  soekortLayersWithAnchors,
  type SoekortAnchors,
  type SoekortVariant,
} from "@/lib/map/soekortStyle";

const SOEKORT_SOURCE_ID = "soekort-overlay";

/**
 * The base map's own layers: those on a vector source that is not one of our
 * PMTiles archives. Raster overlays, imports, the grid and the depth layers
 * themselves are added on top by the app and must not move the anchors.
 */
export function baseLayersOf(map: Pick<MaplibreMap, "getLayersOrder" | "getLayer" | "getSource">): { id: string; type: string }[] {
  const isBaseSource = (id: string) => {
    const src = map.getSource(id) as { type?: string; url?: string } | undefined;
    return src?.type === "vector" && !(src.url ?? "").startsWith("pmtiles://");
  };
  return map.getLayersOrder().flatMap((id) => {
    const layer = map.getLayer(id);
    return layer?.source && isBaseSource(layer.source) ? [{ id, type: layer.type }] : [];
  });
}

const sameAnchors = (a: SoekortAnchors | null, b: SoekortAnchors | null) => JSON.stringify(a) === JSON.stringify(b);

/** The insertion points in the style the map has loaded right now (null: no skærmkort). */
function useSoekortAnchors(): SoekortAnchors | null {
  const { current } = useMap();
  const [anchors, setAnchors] = useState<SoekortAnchors | null>(null);
  useEffect(() => {
    const map = current?.getMap();
    if (!map) return;
    // Not isStyleLoaded(): that stays false while tiles load, and the last
    // styledata event can come before they are done.
    const update = () => {
      const next = soekortAnchors(baseLayersOf(map));
      setAnchors((prev) => (sameAnchors(prev, next) ? prev : next));
    };
    update();
    map.on("styledata", update);
    return () => {
      map.off("styledata", update);
    };
  }, [current]);
  return anchors;
}

/**
 * Our own depth tiles. On the skærmkort the bands and lines go under the land
 * and the numbers under the place names; on any other base map only the lines
 * and numbers are drawn, on top. Keyed by the anchors: a base-map switch puts
 * every layer in again at the new places instead of moving layers that the
 * style swap has already removed.
 */
export function SoekortLayers({ opacity, variant }: { opacity: number; variant: SoekortVariant }) {
  const anchors = useSoekortAnchors();
  ensurePmtilesProtocol();
  const layers = soekortLayersWithAnchors(SOEKORT_SOURCE_ID, anchors, { opacity, variant });
  return (
    <Source
      key={JSON.stringify(anchors)}
      id={SOEKORT_SOURCE_ID}
      type="vector"
      url={`pmtiles://${SOEKORT_URL}`}
      attribution={OVERLAY_SOURCES.soekort.attribution}
    >
      {layers.map(({ layer, beforeId }) => (
        <Layer key={layer.id} {...layer} beforeId={beforeId} />
      ))}
    </Source>
  );
}
