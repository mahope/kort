"use client";

import { useEffect } from "react";
import { useDrawStore, type DrawMode } from "@/stores/drawStore";

// Single-key shortcuts for the drawing tools.
const TOOL_KEYS: Record<string, Exclude<DrawMode, null>> = {
  p: "point",
  l: "line",
  o: "polygon",
  c: "circle",
  r: "rectangle",
  v: "select",
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/** Global keyboard shortcuts for drawing (tools, undo/redo, cancel). */
export function KeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const store = useDrawStore.getState();

      // Undo / redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        store.redo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Cancel the active tool
      if (e.key === "Escape") {
        if (store.activeMode !== null) store.setMode(null);
        return;
      }

      // Tool selection (toggles off when the active tool is pressed again)
      const mode = TOOL_KEYS[e.key.toLowerCase()];
      if (mode) {
        e.preventDefault();
        store.setMode(store.activeMode === mode ? null : mode);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}
