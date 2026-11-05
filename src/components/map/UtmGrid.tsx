"use client";

import { useEffect, useMemo, useState, memo } from "react";
import { Source, Layer, useMap } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useMapStore } from "@/stores/mapStore";
import { computeZonedGrid, gridIntersections, type ZonedGridLine } from "@/lib/geo/zoneGrid";
import { mgrsSquare, type GridSystem } from "@/lib/geo/coordinates";
import {
  dropOverlapping,
  formatSpacing,
  metersPerPixel,
  resolveScreenSpacing,
  resolveUtmZone,
  type FormattedLabel,
  type GridLabelFormat,
  type GridLineClass,
  type LngLatBounds,
} from "@/lib/geo/utmGrid";

const LINE_COLOR = "#1e3a8a";
// Strip reserved along the left edge for northing labels; top labels start after it.
const LEFT_STRIP_PX = 44;
const TOP_STRIP_PX = 22;
// Keep the bottom of the left edge free for the zone badge and attribution.
const LEFT_BOTTOM_RESERVE_PX = 56;

interface ViewInfo {
  bounds: LngLatBounds;
  zone: number;
  mpp: number;
}

function readView(map: MaplibreMap, zoneMode: "dk" | "std"): ViewInfo {
  const b = map.getBounds();
  const c = map.getCenter();
  // Pad the viewport so panning shows lines until the next moveend recompute.
  const padLng = (b.getEast() - b.getWest()) * 0.5;
  const padLat = (b.getNorth() - b.getSouth()) * 0.5;
  return {
    bounds: {
      west: b.getWest() - padLng,
      east: b.getEast() + padLng,
      south: Math.max(-80, b.getSouth() - padLat),
      north: Math.min(84, b.getNorth() + padLat),
    },
    zone: resolveUtmZone(c.lng, c.lat, zoneMode),
    mpp: metersPerPixel(c.lat, map.getZoom()),
  };
}

function lineStyle(cls: GridLineClass, spacing: number): { w: number; o: number } {
  if (cls === "major") return { w: 2.4, o: 0.95 };
  if (cls === "medium") return { w: 1.5, o: 0.85 };
  return spacing < 1000 ? { w: 0.7, o: 0.55 } : { w: 1.1, o: 0.7 };
}

function UtmGridImpl() {
  const { current: mapRef } = useMap();
  const showGrid = useMapStore((s) => s.showUtmGrid);
  const gridSpacing = useMapStore((s) => s.gridSpacing);
  const showLabels = useMapStore((s) => s.showGridLabels);
  const labelFormat = useMapStore((s) => s.gridLabelFormat);
  const savedZoneMode = useMapStore((s) => s.utmZoneMode);
  const system = useMapStore((s) => s.gridSystem);
  const zoneMode = system === "mgrs" ? "std" : savedZoneMode;
  const [view, setView] = useState<ViewInfo | null>(null);

  // Recompute the grid only when a move ends — not on every animation frame.
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !showGrid) return;
    const update = () => setView(readView(map, zoneMode));
    update();
    map.on("moveend", update);
    map.on("resize", update);
    return () => {
      map.off("moveend", update);
      map.off("resize", update);
    };
  }, [mapRef, showGrid, zoneMode]);

  const resolved = useMemo(
    () => (view ? resolveScreenSpacing(gridSpacing, view.mpp) : null),
    [view, gridSpacing]
  );
  const spacing = resolved?.spacing ?? null;

  const lines = useMemo(() => view && spacing ? computeZonedGrid(view.bounds, spacing, zoneMode, view.zone) : [], [view, spacing, zoneMode]);
  const gridData = useMemo(() => {
    if (!lines.length || !spacing) return null;
    return {
      type: "FeatureCollection" as const,
      features: lines.map((l) => {
        const { w, o } = lineStyle(l.cls, spacing);
        return {
          type: "Feature" as const,
          properties: { axis: l.axis, value: l.value, cls: l.cls, w, o },
          geometry: { type: "LineString" as const, coordinates: l.coords },
        };
      }),
    };
  }, [lines, spacing]);

  if (!showGrid || !view) return null;

  return (
    <>
      {gridData && (
        <Source id="utm-grid" type="geojson" data={gridData}>
          <Layer
            id="utm-grid-lines"
            type="line"
            paint={{
              "line-color": LINE_COLOR,
              "line-width": ["get", "w"],
              "line-opacity": ["get", "o"],
            }}
          />
        </Source>
      )}
      {showLabels && spacing && mapRef && (
        <GridEdgeLabels
          map={mapRef.getMap()}
          lines={lines}
          system={system}
          spacing={spacing}
          format={labelFormat}
        />
      )}
      <GridBadge
        zone={view.zone}
        system={system}
        square={mgrsSquare(useMapStore.getState().viewState.latitude, useMapStore.getState().viewState.longitude)}
        spacing={spacing}
        requested={resolved?.requested ?? null}
        coarsened={resolved?.coarsened ?? false}
      />
    </>
  );
}

interface PlacedLabel {
  t: number;
  label: FormattedLabel;
}

/**
 * One coordinate per grid line along the top (eastings) and left (northings)
 * edge of the map, thinned so labels never overlap. Positions follow the map
 * on every frame; the work is ~66 unprojects, so it is cheap.
 */
function GridEdgeLabels({
  map,
  lines,
  system,
  spacing,
  format,
}: {
  map: MaplibreMap;
  lines: ZonedGridLine[];
  system: GridSystem;
  spacing: number;
  format: GridLabelFormat;
}) {
  const [labels, setLabels] = useState<{ top: PlacedLabel[]; left: PlacedLabel[] }>({ top: [], left: [] });

  useEffect(() => {
    let frame = 0;
    const compute = () => {
      frame = 0;
      const el = map.getContainer();
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const topGap = system === "mgrs" ? 66 : 72;
      const leftGap = 24;
      const project = (lng: number, lat: number) => map.project([lng, lat]);
      const top = dropOverlapping(
        gridIntersections(lines, project, [0, TOP_STRIP_PX / 2], [w, TOP_STRIP_PX / 2], system, format)
          .filter((c) => c.t > LEFT_STRIP_PX + topGap / 2 && c.t < w - topGap / 2), topGap);
      const left = dropOverlapping(
        gridIntersections(lines, project, [LEFT_STRIP_PX / 2, 0], [LEFT_STRIP_PX / 2, h], system, format)
          .filter((c) => c.t > TOP_STRIP_PX + leftGap / 2 && c.t < h - LEFT_BOTTOM_RESERVE_PX), leftGap);

      setLabels({ top, left });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(compute);
    };
    compute();
    map.on("move", schedule);
    map.on("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      map.off("move", schedule);
      map.off("resize", schedule);
    };
  }, [map, lines, system, spacing, format]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {labels.top.map((l) => (
        <GridLabel key={`t${l.t.toFixed(0)}-${l.label.main}`} label={l.label} style={{ left: l.t, top: 2, transform: "translateX(-50%)" }} />
      ))}
      {labels.left.map((l) => (
        <GridLabel key={`l${l.t.toFixed(0)}-${l.label.main}`} label={l.label} style={{ left: 2, top: l.t, transform: "translateY(-50%)" }} />
      ))}
    </div>
  );
}

function GridLabel({ label, style }: { label: FormattedLabel; style: React.CSSProperties }) {
  return (
    <span
      className="absolute whitespace-nowrap rounded-sm bg-white/80 px-0.5 font-sans text-[13px] font-bold leading-4 tabular-nums"
      style={{ ...style, color: LINE_COLOR, textShadow: "0 0 2px #fff, 0 0 2px #fff" }}
    >
      {label.prefix && <span className="align-super text-[9px] font-semibold">{label.prefix}</span>}
      {label.main}
    </span>
  );
}

/** Zone/datum badge plus a note when the grid was coarsened or hidden. */
function GridBadge({
  zone,
  system,
  square,
  spacing,
  requested,
  coarsened,
}: {
  zone: number;
  system: GridSystem;
  square: string;
  spacing: number | null;
  requested: number | null;
  coarsened: boolean;
}) {
  let note: string | null = null;
  if (!spacing) note = "Zoom ind for at se gitteret";
  else if (coarsened && requested) note = `Zoom ind for ${formatSpacing(requested)}`;

  return (
    <div
      className="pointer-events-none absolute bottom-8 left-2 z-[1] rounded bg-white/90 px-1.5 py-0.5 text-[11px] leading-tight text-slate-800 shadow-sm max-md:bottom-auto max-md:left-auto max-md:right-2 max-md:top-7"
      data-testid="utm-grid-badge"
    >
      <div className="font-semibold">
        {system === "mgrs" ? `MGRS ${square} · WGS84` : `UTM ${zone}N · ETRS89`}{spacing ? ` · ${formatSpacing(spacing)}` : ""}
      </div>
      {note && <div className="text-slate-600">{note}</div>}
    </div>
  );
}

// No props — memo stops parent (map-move) re-renders from cascading here.
export const UtmGrid = memo(UtmGridImpl);
