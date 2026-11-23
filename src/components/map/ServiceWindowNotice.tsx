"use client";

import { useState, useSyncExternalStore } from "react";
import { useMapRegion } from "@/lib/hooks/useMapRegion";
import {
  isInServiceWindow,
  SERVICE_WINDOW_DISMISS_KEY,
  SERVICE_WINDOW_TEXT,
} from "@/lib/map/serviceWindow";

// A minute clock: the notice appears and disappears on its own while the page is open.
function subscribeMinute(callback: () => void) {
  const id = window.setInterval(callback, 60_000);
  return () => window.clearInterval(id);
}
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;

function readDismissed(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(SERVICE_WINDOW_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Short, closable notice over Danish views during Dataforsyningen's platform move. */
export function ServiceWindowNotice() {
  const region = useMapRegion();
  // Server snapshot 0 = outside the window, so the prerendered page never shows it.
  const now = useSyncExternalStore(subscribeMinute, minuteNow, () => 0);
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed || region !== "dk" || !isInServiceWindow(now)) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(SERVICE_WINDOW_DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <div
      role="status"
      data-testid="service-window-notice"
      className="absolute left-1/2 top-3 z-[5] flex w-[min(30rem,calc(100%-8rem))] -translate-x-1/2 items-start gap-1 rounded bg-white/95 py-1 pl-3 pr-1 text-sm leading-snug text-slate-900 shadow-md"
    >
      <p className="py-2">{SERVICE_WINDOW_TEXT}</p>
      <button
        type="button"
        onClick={close}
        aria-label="Luk beskeden"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
