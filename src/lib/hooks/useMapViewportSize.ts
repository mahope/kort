"use client";

import { useEffect, useState } from "react";

export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * CSS px size of the <main> element that hosts the map, kept live via
 * ResizeObserver so it follows sidebar/window resizes. Null until the first
 * measurement (there is no server render for it to match, so no hydration
 * concern — just a one-frame delay on mount).
 */
export function useMapViewportSize(): ViewportSize | null {
  const [size, setSize] = useState<ViewportSize | null>(null);

  useEffect(() => {
    const el = document.querySelector("main");
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return size;
}
