"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function OfflineBanner() {
  // useSyncExternalStore reads navigator.onLine directly — no setState-in-effect
  // and a stable server snapshot (false) avoids a hydration mismatch.
  const isOffline = useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false
  );

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center text-sm py-1.5 px-4 shadow"
    >
      Du er offline — cached kort-tiles er stadig tilgængelige
    </div>
  );
}
