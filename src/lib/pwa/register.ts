import { useUiStore } from "@/stores/uiStore";

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // Called from a React effect, which usually runs after `load` has fired.
  const start = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Detect a newly installed worker waiting to take over and prompt the
        // user to reload, so a deploy doesn't get stuck behind the old cache.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              useUiStore
                .getState()
                .addToast(
                  "info",
                  "Ny version tilgængelig – genindlæs siden for at opdatere",
                  10000
                );
            }
          });
        });
      })
      .catch((err) => {
        console.warn("SW registration failed:", err);
      });

    // Let the worker cache the hashed assets (incl. fonts) this page loaded.
    navigator.serviceWorker.ready.then((reg) => {
      const urls = performance
        .getEntriesByType("resource")
        .map((e) => new URL(e.name))
        .filter(
          (u) =>
            u.origin === location.origin &&
            u.pathname.startsWith("/_next/static/")
        )
        .map((u) => u.pathname + u.search);
      reg.active?.postMessage({ type: "CACHE_URLS", urls });
    });
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
