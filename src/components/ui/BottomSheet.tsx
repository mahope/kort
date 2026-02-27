"use client";

import { useRef, useCallback, useState, type ReactNode } from "react";

interface BottomSheetProps {
  children: ReactNode;
}

const SNAP_MIN = 80;
const SNAP_MID_VH = 40;
const SNAP_MAX_VH = 85;

function getSnapPoints() {
  const mid = (window.innerHeight * SNAP_MID_VH) / 100;
  const max = (window.innerHeight * SNAP_MAX_VH) / 100;
  return [SNAP_MIN, mid, max];
}

function snapToNearest(height: number): number {
  const points = getSnapPoints();
  let closest = points[0];
  let minDist = Math.abs(height - closest);
  for (const p of points) {
    const dist = Math.abs(height - p);
    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  }
  return closest;
}

export function BottomSheet({ children }: BottomSheetProps) {
  const [height, setHeight] = useState(() =>
    typeof window !== "undefined"
      ? (window.innerHeight * SNAP_MID_VH) / 100
      : 320
  );
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const didDrag = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      didDrag.current = false;
      startY.current = e.clientY;
      startHeight.current = height;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [height]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    didDrag.current = true;
    const maxHeight = (window.innerHeight * SNAP_MAX_VH) / 100;
    const delta = startY.current - e.clientY;
    const newHeight = Math.max(
      SNAP_MIN,
      Math.min(maxHeight, startHeight.current + delta)
    );
    setHeight(newHeight);
  }, []);

  const onPointerUp = useCallback(() => {
    const wasDragging = dragging.current;
    dragging.current = false;

    if (wasDragging && didDrag.current) {
      // Snap to nearest point
      setHeight((h) => snapToNearest(h));
    } else if (wasDragging && !didDrag.current) {
      // Tap: toggle between minimized and mid
      const [min, mid] = getSnapPoints();
      setHeight((h) => (h <= min + 20 ? mid : min));
    }
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-[height] duration-200 ease-out"
      style={{ height, transitionProperty: dragging.current ? "none" : "height" }}
    >
      <div
        className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="w-10 h-1 rounded-full bg-text-muted" />
      </div>
      <div className="overflow-y-auto px-4 pb-20" style={{ height: height - 28 }}>
        {children}
      </div>
    </div>
  );
}
