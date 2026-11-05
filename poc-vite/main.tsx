// Vite entry for the PoC (issue #40). Mirrors src/app/page.tsx + layout.tsx
// for the map page only; next/dynamic is replaced by React.lazy (shim).
import { StrictMode, lazy, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./fonts.css";
import "../src/app/globals.css";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { LoadingOverlay } from "@/components/map/LoadingOverlay";
import { MapControls } from "@/components/map/MapControls";
import { CoordinateReadout } from "@/components/map/CoordinateReadout";
import { KeyboardShortcuts } from "@/components/map/KeyboardShortcuts";
import { UrlSync } from "@/components/map/UrlSync";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ToastContainer } from "@/components/ui/Toast";
import { registerServiceWorker } from "@/lib/pwa/register";
import { enableAnalytics } from "@/lib/analytics";
import { useUiStore } from "@/stores/uiStore";

const MapContainer = lazy(() =>
  import("@/components/map/MapContainer").then((m) => ({ default: m.MapContainer }))
);

function Home() {
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSidebarOpen]);
  useEffect(() => {
    registerServiceWorker();
    enableAnalytics();
  }, []);
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <OfflineBanner />
      <Sidebar />
      <main className="relative flex-1">
        <Suspense fallback={null}>
          <MapContainer />
        </Suspense>
        <MapControls />
        <CoordinateReadout />
        <LoadingOverlay />
      </main>
      <UrlSync />
      <KeyboardShortcuts />
      <ToastContainer />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Home />
  </StrictMode>
);
