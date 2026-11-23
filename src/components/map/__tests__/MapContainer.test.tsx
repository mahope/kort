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
  Layer: ({ id, layout }: { id: string; layout?: { visibility?: string } }) => (
    <div data-layer={id} data-visibility={layout?.visibility} />
  ),
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

it("hides and restores the raster layer while keeping the selected contours", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const { setBaseLayer, setOverlayEnabled } = useMapStore.getState();
  const rasterLayer = '[data-source="base-raster"] [data-layer="base-raster-layer"]';
  const rasterVisibility = () => container.querySelector(rasterLayer)?.getAttribute("data-visibility");
  const contours = '[data-source="kurver5-overlay"]';

  try {
    setBaseLayer("dtk25");
    setOverlayEnabled("kurver5", true);
    act(() => root.render(<MapContainer />));
    expect(rasterVisibility()).toBe("visible");
    expect(container.querySelector(contours)).not.toBeNull();

    act(() => setBaseLayer("none"));
    expect(rasterVisibility()).toBe("none");
    expect(container.querySelector(contours)).not.toBeNull();

    act(() => setBaseLayer("dtk25"));
    expect(rasterVisibility()).toBe("visible");
    expect(container.querySelector(contours)).not.toBeNull();
  } finally {
    act(() => root.unmount());
  }
});

it("keeps the raster base map under the depths when it is chosen after them", () => {
  // MapLibre adds a new layer on top: a base-raster mounted on choosing DTK25
  // after "no base map" covered the always-mounted depth layer.
  const container = document.createElement("div");
  const root = createRoot(container);
  const { setBaseLayer, setOverlayEnabled } = useMapStore.getState();
  const ids = () => [...container.querySelectorAll("[data-layer]")].map((l) => l.getAttribute("data-layer"));
  try {
    setBaseLayer("none");
    act(() => root.render(<MapContainer />));
    const before = ids();
    act(() => setBaseLayer("dtk25"));
    act(() => setOverlayEnabled("dybdemodel", true));
    expect(ids()).toEqual(before);
    expect(ids().indexOf("base-raster-layer")).toBeLessThan(ids().indexOf("dybdemodel-overlay-layer"));
  } finally {
    act(() => root.unmount());
  }
});

it("keeps every raster overlay mounted in the store's order, hidden while off", () => {
  // MapLibre adds a new layer on top, so mounting on toggle drew the grey
  // seabed relief over depth colours switched on earlier.
  const container = document.createElement("div");
  const root = createRoot(container);
  const ids = () => [...container.querySelectorAll("[data-layer$='-overlay-layer']")].map((l) => l.getAttribute("data-layer"));
  const visibility = (id: string) => container.querySelector(`[data-layer="${id}"]`)?.getAttribute("data-visibility");
  try {
    act(() => useMapStore.getState().setOverlayEnabled("dybdemodel", true));
    act(() => root.render(<MapContainer />));
    const before = ids();
    expect(before.indexOf("havbund-overlay-layer")).toBeGreaterThan(-1);
    expect(before.indexOf("havbund-overlay-layer")).toBeLessThan(before.indexOf("dybdemodel-overlay-layer"));
    expect(visibility("havbund-overlay-layer")).toBe("none");
    expect(visibility("dybdemodel-overlay-layer")).toBe("visible");

    act(() => useMapStore.getState().setOverlayEnabled("havbund", true));
    expect(visibility("havbund-overlay-layer")).toBe("visible");
    expect(ids()).toEqual(before);
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
