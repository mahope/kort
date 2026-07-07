"use client";

import { useMemo } from "react";
import { useImportStore } from "@/stores/importStore";
import { useDrawStore } from "@/stores/drawStore";
import {
  extractElevationProfile,
  lineStringsOf,
  type ElevationProfileData,
} from "@/lib/geo/elevation";
import { formatDistance } from "@/lib/geo/measure";

interface NamedProfile {
  name: string;
  data: ElevationProfileData;
  color: string;
}

const W = 100;
const H = 34;

function ProfileChart({ profile }: { profile: NamedProfile }) {
  const { data, name, color } = profile;
  const span = data.maxEle - data.minEle || 1;
  const xy = (dist: number, ele: number): [number, number] => [
    data.distanceM ? (dist / data.distanceM) * W : 0,
    H - ((ele - data.minEle) / span) * H,
  ];
  const linePath = data.points
    .map((p, i) => {
      const [x, y] = xy(p.dist, p.ele);
      return `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const areaPath = `${linePath} L${W} ${H} L0 ${H} Z`;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className="inline-block w-2 h-2 shrink-0 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-foreground truncate">{name}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-16 rounded bg-surface-secondary"
        role="img"
        aria-label={`Højdeprofil for ${name}`}
      >
        <path d={areaPath} fill={color} fillOpacity={0.15} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p className="text-[10px] text-text-muted mt-0.5">
        {formatDistance(data.distanceM)} · {Math.round(data.minEle)}–
        {Math.round(data.maxEle)} m · ↑{Math.round(data.ascentM)} ↓
        {Math.round(data.descentM)} m
      </p>
    </div>
  );
}

/**
 * Elevation profiles for any imported or drawn line that carries elevation
 * (GPX tracks store it as the 3rd coordinate). Renders nothing when there's
 * no elevation data, so it can sit unconditionally in the sidebar.
 */
export function ElevationProfile() {
  const layers = useImportStore((s) => s.layers);
  const features = useDrawStore((s) => s.features);

  const profiles = useMemo<NamedProfile[]>(() => {
    const out: NamedProfile[] = [];
    for (const layer of layers) {
      if (!layer.visible) continue;
      layer.geojson.features.forEach((f, i) => {
        for (const line of lineStringsOf(f.geometry)) {
          const data = extractElevationProfile(line);
          if (data) {
            out.push({
              name: (f.properties?.name as string) || layer.name || `Linje ${i + 1}`,
              data,
              color: layer.style.lineColor,
            });
          }
        }
      });
    }
    for (const f of features) {
      for (const line of lineStringsOf(f.geojson.geometry)) {
        const data = extractElevationProfile(line);
        if (data) {
          out.push({
            name: (f.geojson.properties?.name as string) || "Tegnet linje",
            data,
            color: f.style.lineColor,
          });
        }
      }
    }
    return out;
  }, [layers, features]);

  if (profiles.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Højdeprofil</label>
      <div className="space-y-3">
        {profiles.map((p, idx) => (
          <ProfileChart key={idx} profile={p} />
        ))}
      </div>
    </div>
  );
}
