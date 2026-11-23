import { afterEach, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useMapStore } from "@/stores/mapStore";
import { OVERLAY_LABELS } from "@/lib/map/sources";
import { MapControls } from "../MapControls";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no matchMedia (useIsMobile): a desktop browser.
window.matchMedia ??= ((query: string) =>
  ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList);

afterEach(() => useMapStore.setState(useMapStore.getInitialState()));

it("lists the søkort instead of the depth layers it replaces, with its style under it", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<MapControls />));
    act(() => container.querySelector<HTMLButtonElement>("button[aria-expanded]")!.click());
    const text = () => container.textContent ?? "";
    expect(text()).toContain(OVERLAY_LABELS.soekort);
    for (const id of ["dybdemodel", "havdybder", "soedybder"] as const) expect(text()).not.toContain(OVERLAY_LABELS[id]);
    expect(text()).not.toContain("Søkortets stil");

    act(() => useMapStore.getState().setOverlayEnabled("soekort", true));
    expect(text()).toContain("Søkortets stil");
    const lavvande = container.querySelector<HTMLInputElement>('input[type="radio"][value="lavvande"]')!;
    act(() => lavvande.click());
    expect(useMapStore.getState().soekortVariant).toBe("lavvande");
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
