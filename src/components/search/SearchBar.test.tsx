import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SearchBar } from "./SearchBar";
import { useMapStore } from "@/stores/mapStore";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/lib/api/address", () => ({
  searchAddresses: vi.fn(async () => [
    { id: "a", text: "Vej 1", description: "Adresse", coordinates: [10, 55], type: "address" },
    { id: "b", text: "Vej 2", description: "Adresse", coordinates: [11, 56], type: "address" },
  ]),
  resolveCoordinates: vi.fn(),
}));

describe("SearchBar keyboard flow", () => {
  const flyTo = vi.fn();
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    flyTo.mockClear();
    useMapStore.setState({ flyTo } as never);
    Element.prototype.scrollIntoView = vi.fn();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  async function openResults() {
    await act(async () => root.render(<SearchBar />));
    const input = host.querySelector<HTMLInputElement>("#search-input")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "vej");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(host.querySelectorAll("[role=option]")).toHaveLength(2);
    return input;
  }

  const press = (input: HTMLElement, key: string) =>
    act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    });

  it("renders options without nested interactive children", async () => {
    await openResults();
    for (const opt of host.querySelectorAll("[role=option]")) {
      expect(opt.querySelector("button, a, input, select")).toBeNull();
    }
  });

  it("moves with arrow keys and selects with Enter", async () => {
    const input = await openResults();
    await press(input, "ArrowDown");
    await press(input, "ArrowDown");
    expect(input.getAttribute("aria-activedescendant")).toBe("search-option-1");
    await press(input, "ArrowUp");
    expect(input.getAttribute("aria-activedescendant")).toBe("search-option-0");
    await press(input, "ArrowDown");
    await press(input, "Enter");
    expect(flyTo).toHaveBeenCalledWith(11, 56);
  });

  it("closes the list on Escape", async () => {
    const input = await openResults();
    await press(input, "Escape");
    expect(host.querySelector("[role=listbox]")).toBeNull();
  });
});
