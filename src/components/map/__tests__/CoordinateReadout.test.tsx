import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CoordinateReadout } from "../CoordinateReadout";
import { useMapStore } from "@/stores/mapStore";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("CoordinateReadout declination", () => {
  let container: HTMLDivElement;
  let root: Root;

  const mount = async () => {
    await act(async () => {
      root.render(<CoordinateReadout />);
    });
  };
  const open = async () => {
    await act(async () => {
      const details = container.querySelector("details")!;
      details.open = true;
      details.dispatchEvent(new Event("toggle"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    useMapStore.setState({ viewState: { ...useMapStore.getState().viewState, latitude: 55.68, longitude: 12.57 } });
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("shows the declination with its year once the panel is opened", async () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 5)));
    await mount();
    expect(container.querySelector('[data-testid="declination-readout"]')).toBeNull();
    await open();
    const el = container.querySelector('[data-testid="declination-readout"]');
    expect(el?.textContent).toMatch(/Misvisning/);
    expect(el?.textContent).toMatch(/\(2026\)/);
    expect(el?.querySelector('[role="note"]')).toBeNull();
  });

  it("shows an expiry note but keeps the value in the last half year", async () => {
    vi.setSystemTime(new Date(Date.UTC(2029, 8, 1)));
    await mount();
    await open();
    const el = container.querySelector('[data-testid="declination-readout"]')!;
    expect(el.querySelector('[role="note"]')?.textContent).toMatch(/udløber 2030/);
    expect(el.textContent).toMatch(/\(2029\)/);
  });

  it("shows only a note, no value, when the model has expired", async () => {
    vi.setSystemTime(new Date(Date.UTC(2030, 0, 2)));
    await mount();
    await open();
    const el = container.querySelector('[data-testid="declination-readout"]')!;
    expect(el.querySelector('[role="note"]')?.textContent).toMatch(/vises ikke/);
    expect(el.querySelector(".font-mono")).toBeNull();
  });
});
