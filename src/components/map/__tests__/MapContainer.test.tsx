import { afterEach, expect, it, vi } from "vitest";
import { act, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { useMapStore } from "@/stores/mapStore";
import { KDS_MAP_ATTRIBUTION, NORDIC_MAP_ATTRIBUTION } from "@/lib/map/sources";
import { MapContainer } from "../MapContainer";
import { DENMARK_TILE_BOUNDS } from "@/lib/tiles/routeLayers";

vi.mock("maplibre-gl", () => ({ default: {}, setWorkerUrl: () => {} }));
vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Source: ({ id, bounds, children }: { id: string; bounds?: number[]; children: ReactNode }) => (
    <div data-source={id} data-bounds={bounds?.join(",")}>{children}</div>
  ),
  Layer: ({ id }: { id: string }) => <div data-layer={id} />,
  NavigationControl: () => null,
  ScaleControl: () => null,
  // Like react-map-gl: the options are read once, when the control is created.
  AttributionControl: function AttributionControl({ customAttribution }: { customAttribution?: string }) {
    useEffect(() => { attributionsAtCreation.push(customAttribution); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  },
}));
const attributionsAtCreation = vi.hoisted(() => [] as (string | undefined)[]);
vi.mock("../PrintFrame", () => ({ PrintFrame: () => null }));
vi.mock("../GeolocationButton", () => ({ GeolocationButton: () => null }));
vi.mock("../ImportedLayers", () => ({ ImportedLayers: () => null }));
vi.mock("../UtmGrid", () => ({ UtmGrid: () => null }));
vi.mock("@/lib/map/contours", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/map/contours")>(),
  ensurePmtilesProtocol: () => {},
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => useMapStore.setState(useMapStore.getInitialState()));

it("removes and restores the raster layer while keeping the selected contours", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const { setBaseLayer, setOverlayEnabled } = useMapStore.getState();
  const rasterLayer = '[data-source="base-raster"] [data-layer="base-raster-layer"]';
  const contours = '[data-source="kurver5-overlay"]';

  try {
    setBaseLayer("dtk25");
    setOverlayEnabled("kurver5", true);
    act(() => root.render(<MapContainer />));
    expect(container.querySelector(rasterLayer)).not.toBeNull();
    expect(container.querySelector(contours)).not.toBeNull();

    act(() => setBaseLayer("none"));
    expect(container.querySelector('[data-source="base-raster"]')).toBeNull();
    expect(container.querySelector(contours)).not.toBeNull();

    act(() => setBaseLayer("dtk25"));
    expect(container.querySelector(rasterLayer)).not.toBeNull();
    expect(container.querySelector(contours)).not.toBeNull();
  } finally {
    act(() => root.unmount());
  }
});

it("limits the Danish raster base map to the tile route's bounds", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    useMapStore.getState().setBaseLayer("dtk25");
    act(() => root.render(<MapContainer />));
    const source = container.querySelector('[data-source="base-raster"]');
    expect(source?.getAttribute("data-bounds")).toBe(DENMARK_TILE_BOUNDS.join(","));
  } finally {
    act(() => root.unmount());
  }
});

it("recreates the attribution control when the map moves to another region", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  attributionsAtCreation.length = 0;
  try {
    act(() => useMapStore.setState({ viewState: { ...useMapStore.getState().viewState, longitude: 10.5, latitude: 56 } }));
    act(() => root.render(<MapContainer />));
    expect(attributionsAtCreation).toEqual([KDS_MAP_ATTRIBUTION]);

    // Oslo
    act(() => useMapStore.setState({ viewState: { ...useMapStore.getState().viewState, longitude: 10.75, latitude: 59.91 } }));
    expect(attributionsAtCreation).toEqual([KDS_MAP_ATTRIBUTION, NORDIC_MAP_ATTRIBUTION]);
  } finally {
    act(() => root.unmount());
  }
});
