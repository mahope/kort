import { useUiStore } from "@/stores/uiStore";

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
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
  });
}
