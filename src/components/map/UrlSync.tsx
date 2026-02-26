"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { serializeState, deserializeState } from "@/lib/url/urlState";

export function UrlSync() {
  const initialized = useRef(false);

  // Parse URL on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const search = window.location.search;
    if (!search) return;

    const state = deserializeState(search);
    const mapStore = useMapStore.getState();
    const printStore = usePrintStore.getState();

    if (state.lng !== undefined && state.lat !== undefined && state.zoom !== undefined) {
      mapStore.setViewState({
        ...mapStore.viewState,
        longitude: state.lng,
        latitude: state.lat,
        zoom: state.zoom,
        bearing: state.bearing ?? mapStore.viewState.bearing,
      });
    }

    if (state.baseLayer) mapStore.setBaseLayer(state.baseLayer);
    if (state.style) mapStore.setStyle(state.style);
    if (state.scale) printStore.setScale(state.scale);
    if (state.paperFormat) printStore.setPaperFormat(state.paperFormat);
    if (state.orientation) printStore.setOrientation(state.orientation);
    if (state.dpi) printStore.setDpi(state.dpi);
  }, []);

  // Sync stores to URL (debounced)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const unsubs = [
      useMapStore.subscribe(() => {
        clearTimeout(timeout);
        timeout = setTimeout(updateUrl, 500);
      }),
      usePrintStore.subscribe(() => {
        clearTimeout(timeout);
        timeout = setTimeout(updateUrl, 500);
      }),
    ];

    return () => {
      clearTimeout(timeout);
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  return null;
}

function updateUrl() {
  const mapState = useMapStore.getState();
  const printState = usePrintStore.getState();

  const qs = serializeState({
    lng: mapState.viewState.longitude,
    lat: mapState.viewState.latitude,
    zoom: mapState.viewState.zoom,
    bearing: mapState.viewState.bearing,
    baseLayer: mapState.baseLayer,
    style: mapState.style,
    scale: printState.scale,
    paperFormat: printState.paperFormat,
    orientation: printState.orientation,
    dpi: printState.dpi,
  });

  const newUrl = `${window.location.pathname}?${qs}`;
  window.history.replaceState(null, "", newUrl);
}
