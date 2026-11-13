import { forward } from "mgrs";
import { latlngToUtm } from "./utm";
import { latlngToDktm, type DktmZone } from "./dktm";

export const GRID_SYSTEMS = ["utm", "mgrs", "dktm1", "dktm2", "dktm3", "dktm4"] as const;
export type GridSystem = (typeof GRID_SYSTEMS)[number];

export function isGridSystem(v: string): v is GridSystem {
  return (GRID_SYSTEMS as readonly string[]).includes(v);
}

const DKTM_SYSTEMS = ["dktm1", "dktm2", "dktm3", "dktm4"] as const;
export type DktmGridSystem = (typeof DKTM_SYSTEMS)[number];

export function isDktmSystem(system: GridSystem): system is DktmGridSystem {
  return (DKTM_SYSTEMS as readonly string[]).includes(system);
}

/** "dktm2" → 2. */
export function dktmZoneOf(system: DktmGridSystem): DktmZone {
  return Number(system.slice(4)) as DktmZone;
}

export function formatMgrs(lat: number, lng: number, precision: 4 | 5 = 5): string {
  const raw = forward([lng, lat], precision);
  return raw.replace(/^(\d+[A-Z])([A-Z]{2})(\d+)$/, (_, zone, square, digits) =>
    `${zone} ${square} ${digits.slice(0, precision)} ${digits.slice(precision)}`);
}

export function mgrsSquare(lat: number, lng: number): string {
  return formatMgrs(lat, lng).split(" ").slice(0, 2).join(" ");
}

/**
 * Reference coordinates for the readout panel ("Koordinat ved sigtekorset").
 * Always shows MGRS, UTM and lat/lng — the panel is a fixed reference list,
 * independent of the on-map grid system setting. A DKTM row is added only
 * when a DKTM zone is the active grid system, since there is no single
 * "default" DKTM zone to show otherwise.
 */
export function pointCoordinates(lat: number, lng: number, system?: GridSystem) {
  const utm = latlngToUtm(lat, lng);
  const rows = [
    { name: "MGRS · 1 m", value: formatMgrs(lat, lng, 5) },
    { name: "MGRS · 10 m", value: formatMgrs(lat, lng, 4) },
    { name: "UTM · WGS84", value: `${utm.zone}${lat >= 0 ? "N" : "S"} ${Math.floor(utm.easting)} ${Math.floor(utm.northing)}` },
    { name: "Bredde/længde · WGS84", value: `${lat.toFixed(6)}, ${lng.toFixed(6)}` },
  ];
  if (system && isDktmSystem(system)) {
    const zone = dktmZoneOf(system);
    const d = latlngToDktm(lat, lng, zone);
    rows.push({ name: `DKTM${zone} · ETRS89`, value: `${Math.floor(d.easting)} ${Math.floor(d.northing)}` });
  }
  return rows;
}
