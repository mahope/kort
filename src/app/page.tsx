"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { LoadingOverlay } from "@/components/map/LoadingOverlay";
import { MapControls } from "@/components/map/MapControls";
import { UrlSync } from "@/components/map/UrlSync";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { registerServiceWorker } from "@/lib/pwa/register";
import { useUiStore } from "@/stores/uiStore";

const MapContainer = dynamic(
  () =>
    import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  { ssr: false }
);

export default function Home() {
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
  }, []);

  return (
    <div className="flex h-screen w-screen">
      <OfflineBanner />
      <Sidebar />
      <main className="relative flex-1">
        <MapContainer />
        <MapControls />
        <LoadingOverlay />
      </main>
      <UrlSync />
    </div>
  );
}
