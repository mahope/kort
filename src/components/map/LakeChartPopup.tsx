"use client";

import { useEffect, useState } from "react";
import { Popup, useMap } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { lakeChartDetails, lakeChartImageUrl, parseLakeCharts, type LakeChart } from "@/lib/map/lakeCharts";

const LAYER_ID = "indsoekort-overlay-point";

/** Click a lake-chart marker: name, surveyor and year, and a link to the scanned chart. */
export function LakeChartPopup() {
  const { current: mapRef } = useMap();
  const [chart, setChart] = useState<LakeChart | null>(null);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const [c] = parseLakeCharts({ features: [f as never] });
      setChart(c);
    };
    const pointer = () => (map.getCanvas().style.cursor = "pointer");
    const reset = () => (map.getCanvas().style.cursor = "");
    map.on("click", LAYER_ID, onClick);
    map.on("mouseenter", LAYER_ID, pointer);
    map.on("mouseleave", LAYER_ID, reset);
    return () => {
      map.off("click", LAYER_ID, onClick);
      map.off("mouseenter", LAYER_ID, pointer);
      map.off("mouseleave", LAYER_ID, reset);
      reset();
    };
  }, [mapRef]);

  if (!chart) return null;
  return (
    <Popup longitude={chart.lng} latitude={chart.lat} anchor="bottom" onClose={() => setChart(null)} maxWidth="260px">
      <div className="text-xs text-slate-900">
        <p className="font-semibold">{chart.title}</p>
        <p>Historisk indsøkort{lakeChartDetails(chart) ? `: ${lakeChartDetails(chart)}` : ""}</p>
        <p className="mt-1">
          <strong>Må ikke bruges til navigation.</strong> Kortet er historisk, og dybderne kan have ændret sig.
        </p>
        <p className="mt-1">Kommer med som ekstra side i PDF&apos;en, når søen er inden for udskriften.</p>
        <a
          href={lakeChartImageUrl(chart, 2000)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block underline"
        >
          Se det skannede kort
        </a>
      </div>
    </Popup>
  );
}
