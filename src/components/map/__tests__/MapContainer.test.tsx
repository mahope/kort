import { afterEach, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { useMapStore } from "@/stores/mapStore";
import { MapContainer } from "../MapContainer";

vi.mock("maplibre-gl", () => ({ default: {}, setWorkerUrl: () => {} }));
vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Source: ({ id, children }: { id: string; children: ReactNode }) => (
    <div data-source={id}>{children}</div>
  ),
  Layer: ({ id }: { id: string }) => <div data-layer={id} />,
  NavigationControl: () => null,
  ScaleControl: () => null,
  AttributionControl: () => null,
}));
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
