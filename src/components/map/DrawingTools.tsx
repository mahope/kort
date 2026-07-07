"use client";

import { useEffect, useRef, useCallback, memo } from "react";
import { useMap } from "react-map-gl/maplibre";
import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawCircleMode,
  TerraDrawRectangleMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { useDrawStore, DRAW_DEFAULT_STYLE } from "@/stores/drawStore";
import type { DrawnFeature } from "@/stores/drawStore";

const TERRA_MODE_MAP = {
  point: "point",
  line: "linestring",
  polygon: "polygon",
  circle: "circle",
  rectangle: "rectangle",
  select: "select",
} as const;

function DrawingToolsImpl() {
  const { current: mapInstance } = useMap();
  const drawRef = useRef<TerraDraw | null>(null);
  const activeMode = useDrawStore((s) => s.activeMode);
  const setFeatures = useDrawStore((s) => s.setFeatures);
  const features = useDrawStore((s) => s.features);

  // Lazy init: only create Terra Draw when a mode is first activated
  const ensureDraw = useCallback(() => {
    if (drawRef.current) return drawRef.current;
    if (!mapInstance) return null;

    const map = mapInstance.getMap();
    if (!map.isStyleLoaded()) return null;

    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [
        new TerraDrawPointMode(),
        new TerraDrawLineStringMode(),
        new TerraDrawPolygonMode(),
        new TerraDrawCircleMode(),
        new TerraDrawRectangleMode(),
        new TerraDrawSelectMode({
          flags: {
            point: { feature: { draggable: true } },
            linestring: {
              feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } },
            },
            polygon: {
              feature: { draggable: true, coordinates: { midpoints: true, draggable: true, deletable: true } },
            },
            circle: { feature: { draggable: true } },
            rectangle: { feature: { draggable: true } },
          },
        }),
      ],
    });

    draw.start();
    drawRef.current = draw;
    return draw;
  }, [mapInstance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (drawRef.current) {
        drawRef.current.stop();
        drawRef.current = null;
      }
    };
  }, []);

  // Switching the base map reloads the MapLibre style, which wipes every
  // imperatively-added layer — including Terra Draw's — and leaves drawRef
  // pointing at a dead instance. Rebuild it on style.load and restore the
  // drawn features from the store so drawings survive a base-map change.
  useEffect(() => {
    if (!mapInstance) return;
    const map = mapInstance.getMap();

    const handleStyleLoad = () => {
      const hadDraw = drawRef.current !== null;
      const featuresToRestore = useDrawStore.getState().features;
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch {
          // ignore
        }
        drawRef.current = null;
      }
      // Nothing to rebuild if drawing was never started and there's no state.
      if (!hadDraw && featuresToRestore.length === 0) return;

      const draw = ensureDraw();
      if (!draw) return;

      if (featuresToRestore.length > 0) {
        try {
          draw.addFeatures(
            featuresToRestore.map((f) => f.geojson) as Parameters<
              typeof draw.addFeatures
            >[0]
          );
        } catch {
          // ignore features Terra Draw refuses to re-hydrate
        }
      }
      const mode = useDrawStore.getState().activeMode;
      if (mode) {
        try {
          draw.setMode(TERRA_MODE_MAP[mode]);
        } catch {
          // ignore
        }
      }
    };

    map.on("style.load", handleStyleLoad);
    return () => {
      map.off("style.load", handleStyleLoad);
    };
  }, [mapInstance, ensureDraw]);

  // Sync mode - only init Terra Draw when a mode is selected
  useEffect(() => {
    if (activeMode === null) {
      // Deactivate if already initialized
      const draw = drawRef.current;
      if (draw) {
        try {
          draw.setMode("static");
        } catch {
          // ignore
        }
      }
      return;
    }

    const draw = ensureDraw();
    if (!draw) return;

    const terraMode = TERRA_MODE_MAP[activeMode];
    try {
      draw.setMode(terraMode);
    } catch {
      // ignore if already in that mode
    }
  }, [activeMode, ensureDraw]);

  // Sync features from Terra Draw on changes, preserving existing styles
  const syncFeatures = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const currentFeatures = useDrawStore.getState().features;
    const existingStyles = new Map(currentFeatures.map((f) => [f.id, f.style]));

    const snapshot = draw.getSnapshot();
    const drawnFeatures: DrawnFeature[] = snapshot
      .filter((f) => f.properties?.mode !== "select")
      .map((f) => ({
        id: String(f.id),
        geojson: f as unknown as GeoJSON.Feature,
        style: existingStyles.get(String(f.id)) ?? { ...DRAW_DEFAULT_STYLE },
      }));

    setFeatures(drawnFeatures);
  }, [setFeatures]);

  // Listen for draw events — combined with mode sync to ensure drawRef is ready
  useEffect(() => {
    if (activeMode === null) return;

    const draw = ensureDraw();
    if (!draw) return;

    const onFinish = () => syncFeatures();
    const onChange = () => syncFeatures();

    draw.on("finish", onFinish);
    draw.on("change", onChange);

    return () => {
      draw.off("finish", onFinish);
      draw.off("change", onChange);
    };
  }, [syncFeatures, activeMode, ensureDraw]);

  // Sync removals from store to Terra Draw
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const snapshot = draw.getSnapshot();
    const storeIds = new Set(features.map((f) => f.id));

    for (const f of snapshot) {
      if (f.properties?.mode === "select") continue;
      if (!storeIds.has(String(f.id))) {
        try {
          draw.removeFeatures([f.id as string]);
        } catch {
          // feature may already be removed
        }
      }
    }
  }, [features]);

  return null;
}

export const DrawingTools = memo(DrawingToolsImpl);
