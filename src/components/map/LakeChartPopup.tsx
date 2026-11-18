"use client";

import { useEffect, useState } from "react";
import { Popup, useMap } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { lakeChartDetails, lakeChartImageUrl, parseLakeCharts, type LakeChart } from "@/lib/map/lakeCharts";

const LAYER_ID = "indsoekort-overlay-point";

/**
 * Click a lake-chart marker: name, surveyor and year, and a link to the scanned
 * chart. Some lakes have several charts on the exact same point (e.g. Bagsværd
 * Sø 1976 and 1993), so every chart under the click is listed.
 */
export function LakeChartPopup() {
  const { current: mapRef } = useMap();
  const [charts, setCharts] = useState<LakeChart[]>([]);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onClick = (e: MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const parsed = parseLakeCharts({ features: e.features as never });
      setCharts(parsed.filter((c, i) => parsed.findIndex((o) => o.id === c.id) === i));
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

  const [first] = charts;
  if (!first) return null;
  return (
    <Popup longitude={first.lng} latitude={first.lat} anchor="bottom" onClose={() => setCharts([])} maxWidth="260px">
      <div className="text-xs text-slate-900">
        {charts.map((chart) => (
          <div key={chart.id} className="mb-1">
            <p className="font-semibold">{chart.title}</p>
            <p>Historisk indsøkort{lakeChartDetails(chart) ? `: ${lakeChartDetails(chart)}` : ""}</p>
            <a
              href={lakeChartImageUrl(chart, 2000)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block underline"
            >
              Se det skannede kort
            </a>
          </div>
        ))}
        <p className="mt-1">
          <strong>Må ikke bruges til navigation.</strong> Kortet er historisk, og dybderne kan have ændret sig.
        </p>
        <p className="mt-1">
          {charts.length > 1 ? "Kommer med som ekstra sider" : "Kommer med som ekstra side"} i PDF&apos;en, når søen
          er inden for udskriften.
        </p>
      </div>
    </Popup>
  );
}
