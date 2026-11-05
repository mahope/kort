"use client";

import { useRef, useCallback, useEffect, useState, type ReactNode } from "react";

interface BottomSheetProps {
  children: ReactNode;
  /** Pinned below the scroll area (primary action); never overlaps content. */
  footer?: ReactNode;
}

type SheetPosition = "min" | "mid" | "max";

// Heights live in CSS (globals.css: --sheet-min/mid/max) so the first server
// render already has the final layout and dvh follows resize and rotation.
const SNAP_MIN_PX = 108;
const SNAP_MID_FRAC = 0.4;
const SNAP_MAX_FRAC = 0.6;

function snapPointsPx(): Record<SheetPosition, number> {
  const vh = window.innerHeight;
  return { min: SNAP_MIN_PX, mid: vh * SNAP_MID_FRAC, max: vh * SNAP_MAX_FRAC };
}

function nearestPosition(heightPx: number): SheetPosition {
  const points = snapPointsPx();
  let best: SheetPosition = "min";
  for (const key of ["mid", "max"] as const) {
    if (Math.abs(heightPx - points[key]) < Math.abs(heightPx - points[best])) best = key;
  }
  return best;
}

/**
 * One <aside> for all viewports: a bottom sheet below md, a fixed-width
 * sidebar from md up. The sheet height is published as --sheet-h on <html>
 * so the map controls can sit above it.
 */
export function BottomSheet({ children, footer }: BottomSheetProps) {
  const [position, setPosition] = useState<SheetPosition>("mid");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const didDrag = useRef(false);
  const sheetRef = useRef<HTMLElement>(null);

  const height = dragHeight !== null ? `${dragHeight}px` : `var(--sheet-${position})`;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sheet-h", height);
    return () => {
      root.style.removeProperty("--sheet-h");
    };
  }, [height]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    didDrag.current = false;
    startY.current = e.clientY;
    startHeight.current = sheetRef.current?.getBoundingClientRect().height ?? SNAP_MIN_PX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    didDrag.current = true;
    const maxHeight = window.innerHeight * SNAP_MAX_FRAC;
    const delta = startY.current - e.clientY;
    setDragHeight(Math.max(SNAP_MIN_PX, Math.min(maxHeight, startHeight.current + delta)));
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (didDrag.current) {
      setDragHeight((h) => {
        if (h !== null) setPosition(nearestPosition(h));
        return null;
      });
    } else {
      // Tap: toggle between minimized and mid
      setPosition((p) => (p === "min" ? "mid" : "min"));
    }
  }, []);

  return (
    <aside
      ref={sheetRef}
      aria-label="Kortindstillinger"
      data-dragging={dragHeight !== null}
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col max-md:h-[var(--sheet-h)] rounded-t-2xl bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-[height] duration-200 ease-out data-[dragging=true]:transition-none md:static md:w-80 md:shrink-0 md:rounded-none md:border-r md:border-sidebar-border md:bg-sidebar-bg md:shadow-none"
    >
      <div
        data-sheet-handle
        className="flex shrink-0 cursor-grab touch-none items-center justify-center py-2 active:cursor-grabbing md:hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="h-1 w-10 rounded-full bg-text-muted" />
      </div>
      <div
        data-sheet-scroll
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4 max-md:pt-0"
      >
        {children}
      </div>
      {footer && (
        <div className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:bg-sidebar-bg">
          {footer}
        </div>
      )}
    </aside>
  );
}
