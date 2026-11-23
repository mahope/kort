import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ServiceWindowNotice } from "../ServiceWindowNotice";
import { SERVICE_WINDOW_DISMISS_KEY } from "@/lib/map/serviceWindow";
import { useMapStore } from "@/stores/mapStore";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ServiceWindowNotice", () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialView = useMapStore.getState().viewState;

  const mountAt = async (iso: string, lng = 10.565, lat = 56.214) => {
    vi.setSystemTime(new Date(iso));
    useMapStore.setState({ viewState: { ...initialView, longitude: lng, latitude: lat } });
    await act(async () => {
      root.render(<ServiceWindowNotice />);
    });
  };
  const notice = () => container.querySelector("[data-testid=service-window-notice]");

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    localStorage.removeItem(SERVICE_WINDOW_DISMISS_KEY);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    useMapStore.setState({ viewState: initialView });
  });

  it("shows over a Danish view during the window", async () => {
    await mountAt("2026-11-27T10:00:00Z");
    expect(notice()?.textContent).toContain("Dataforsyningen flytter platform");
  });

  it("is absent before and after the window", async () => {
    await mountAt("2026-11-26T14:59:00Z");
    expect(notice()).toBeNull();
    await mountAt("2026-11-30T07:00:00Z");
    expect(notice()).toBeNull();
  });

  it("is absent over Norway, where the Danish layers are not used", async () => {
    await mountAt("2026-11-27T10:00:00Z", 10.75, 59.91);
    expect(notice()).toBeNull();
  });

  it("goes away by itself when the window ends while the page is open", async () => {
    await mountAt("2026-11-30T06:59:30Z");
    expect(notice()).not.toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(notice()).toBeNull();
  });

  it("stays closed after Luk", async () => {
    await mountAt("2026-11-27T10:00:00Z");
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button[aria-label='Luk beskeden']")!.click();
    });
    expect(notice()).toBeNull();
    expect(localStorage.getItem(SERVICE_WINDOW_DISMISS_KEY)).toBe("1");
  });
});
