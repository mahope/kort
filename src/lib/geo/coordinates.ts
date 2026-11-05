import { forward } from "mgrs";
import { latlngToUtm } from "./utm";

export type GridSystem = "utm" | "mgrs";

export function formatMgrs(lat: number, lng: number, precision: 4 | 5 = 5): string {
  const raw = forward([lng, lat], precision);
  return raw.replace(/^(\d+[A-Z])([A-Z]{2})(\d+)$/, (_, zone, square, digits) =>
    `${zone} ${square} ${digits.slice(0, precision)} ${digits.slice(precision)}`);
}

export function mgrsSquare(lat: number, lng: number): string {
  return formatMgrs(lat, lng).split(" ").slice(0, 2).join(" ");
}

export function pointCoordinates(lat: number, lng: number) {
  const utm = latlngToUtm(lat, lng);
  return [
    { name: "MGRS · 1 m", value: formatMgrs(lat, lng, 5) },
    { name: "MGRS · 10 m", value: formatMgrs(lat, lng, 4) },
    { name: "UTM · WGS84", value: `${utm.zone}${lat >= 0 ? "N" : "S"} ${Math.floor(utm.easting)} ${Math.floor(utm.northing)}` },
    { name: "Bredde/længde · WGS84", value: `${lat.toFixed(6)}, ${lng.toFixed(6)}` },
  ];
}
