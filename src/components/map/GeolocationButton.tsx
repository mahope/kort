"use client";

import { useState, useCallback, type RefObject } from "react";
import { Source, Layer, type MapRef } from "react-map-gl/maplibre";

interface GeolocationButtonProps {
  mapRef: RefObject<MapRef | null>;
}

type GeoState = "idle" | "loading" | "active" | "error";

export function GeolocationButton({ mapRef }: GeolocationButtonProps) {
  const [state, setState] = useState<GeoState>("idle");
  const [position, setPosition] = useState<{ lng: number; lat: number; accuracy: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClick = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolokation er ikke understøttet i din browser");
      setState("error");
      return;
    }

    setState("loading");
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude, accuracy } = pos.coords;
        setPosition({ lng: longitude, lat: latitude, accuracy });
        setState("active");

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 1500,
          });
        }
      },
      (err) => {
        setState("error");
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setErrorMsg("Adgang til lokation nægtet");
            break;
          case err.POSITION_UNAVAILABLE:
            setErrorMsg("Lokation ikke tilgængelig");
            break;
          case err.TIMEOUT:
            setErrorMsg("Lokationsforespørgsel timeout");
            break;
          default:
            setErrorMsg("Kunne ikke finde din position");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [mapRef]);

  // Accuracy ring as a GeoJSON circle approximation
  const accuracyGeoJSON = position
    ? createCircleGeoJSON(position.lng, position.lat, position.accuracy)
    : null;

  const pointGeoJSON = position
    ? {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "Point" as const,
              coordinates: [position.lng, position.lat],
            },
          },
        ],
      }
    : null;

  return (
    <>
      {/* Position marker */}
      {position && accuracyGeoJSON && pointGeoJSON && (
        <>
          <Source id="geolocation-accuracy" type="geojson" data={accuracyGeoJSON}>
            <Layer
              id="geolocation-accuracy-fill"
              type="fill"
              paint={{
                "fill-color": "#3b82f6",
                "fill-opacity": 0.1,
              }}
            />
            <Layer
              id="geolocation-accuracy-line"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": 1,
                "line-opacity": 0.3,
              }}
            />
          </Source>
          <Source id="geolocation-point" type="geojson" data={pointGeoJSON}>
            <Layer
              id="geolocation-point-outer"
              type="circle"
              paint={{
                "circle-radius": 10,
                "circle-color": "#ffffff",
                "circle-opacity": 0.9,
              }}
            />
            <Layer
              id="geolocation-point-inner"
              type="circle"
              paint={{
                "circle-radius": 6,
                "circle-color": "#3b82f6",
              }}
            />
          </Source>
        </>
      )}

      {/* Button */}
      <div className="absolute bottom-28 right-2.5 z-10">
        <button
          type="button"
          onClick={handleClick}
          disabled={state === "loading"}
          title={errorMsg || "Find min position"}
          className={`flex items-center justify-center w-[29px] h-[29px] rounded bg-surface shadow-md border border-border hover:bg-surface-secondary transition-colors ${
            state === "active" ? "text-primary" : state === "error" ? "text-accent" : "text-text-secondary"
          } ${state === "loading" ? "animate-pulse" : ""}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {state === "active" ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" stroke="none" />
            ) : (
              <>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              </>
            )}
          </svg>
        </button>
        {errorMsg && state === "error" && (
          <div className="absolute bottom-full right-0 mb-1 w-48 rounded bg-red-50 border border-red-200 p-2 text-xs text-red-600 shadow">
            {errorMsg}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Create a GeoJSON polygon approximating a circle on the map.
 */
function createCircleGeoJSON(lng: number, lat: number, radiusM: number) {
  const points = 64;
  const coords: [number, number][] = [];
  const latRad = (lat * Math.PI) / 180;

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusM * Math.cos(angle)) / (111320 * Math.cos(latRad));
    const dy = (radiusM * Math.sin(angle)) / 111320;
    coords.push([lng + dx, lat + dy]);
  }

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "Polygon" as const,
          coordinates: [coords],
        },
      },
    ],
  };
}
