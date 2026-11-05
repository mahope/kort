import { setWorkerUrl } from "maplibre-gl";

// maplibre-gl 6 loads its web worker from a separate file next to the main
// module. A bundler moves the main module into a chunk, so the default lookup
// misses the worker; point MapLibre at the bundled asset explicitly.
let configured = false;

export function configureMaplibreWorker() {
  if (configured || typeof window === "undefined") return;
  configured = true;
  setWorkerUrl(
    new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href
  );
}
