"use client";

import { useRef, useCallback, useState, type ReactNode } from "react";

interface BottomSheetProps {
  children: ReactNode;
}

const MIN_HEIGHT = 80;
const MAX_VH = 85;

export function BottomSheet({ children }: BottomSheetProps) {
  const [height, setHeight] = useState(320);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startHeight.current = height;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [height]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const maxHeight = (window.innerHeight * MAX_VH) / 100;
    const delta = startY.current - e.clientY;
    const newHeight = Math.max(
      MIN_HEIGHT,
      Math.min(maxHeight, startHeight.current + delta)
    );
    setHeight(newHeight);
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
      style={{ height }}
    >
      <div
        className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>
      <div className="overflow-y-auto px-4 pb-4" style={{ height: height - 28 }}>
        {children}
      </div>
    </div>
  );
}
