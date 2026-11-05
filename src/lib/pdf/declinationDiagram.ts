import type { jsPDF } from "jspdf";
import type { PdfLayout } from "@/types/print";
import {
  formatDeclination,
  magneticDeclination,
  meridianConvergence,
} from "@/lib/geo/declination";
import { WMM_MODEL, decimalYear, isWithinWmmValidity } from "@/lib/geo/declinationValidity";

/** Box size and inset from the map corner (mm). Bottom-right, away from scale bar (left) and north arrow (top right). */
export const DECLINATION_BOX = { widthMm: 54, heightMm: 25, insetMm: 3 } as const;

export interface DeclinationInfo {
  /** Degrees, east positive. */
  declination: number;
  /** Meridian convergence in degrees (east positive), null without a UTM grid. */
  convergence: number | null;
  year: number;
}

/** Declination (and grid convergence when a UTM zone is given) for the frame centre; null when the model is out of validity. */
export function computeDeclinationInfo(
  lat: number,
  lng: number,
  zone: number | null,
  date: Date = new Date()
): DeclinationInfo | null {
  if (!isWithinWmmValidity(decimalYear(date))) return null;
  return {
    declination: magneticDeclination(lat, lng, date),
    convergence: zone === null ? null : meridianConvergence(lat, lng, zone),
    year: date.getUTCFullYear(),
  };
}

/** Rectangle of the diagram box in page millimetres (inside the map area, bottom-right). */
export function declinationBoxRect(layout: Pick<PdfLayout, "marginMm" | "mapWidthMm" | "mapHeightMm">) {
  const { widthMm, heightMm, insetMm } = DECLINATION_BOX;
  const right = layout.marginMm + layout.mapWidthMm - insetMm;
  const bottom = layout.marginMm + layout.mapHeightMm - insetMm;
  return { left: right - widthMm, top: bottom - heightMm, right, bottom };
}

/**
 * Small "true north / grid north / magnetic north" diagram. Angles are drawn
 * true to scale (so they are small); `bearing` is the map rotation so the
 * diagram agrees with the north arrow.
 */
export function drawDeclinationDiagram(
  pdf: jsPDF,
  layout: Pick<PdfLayout, "marginMm" | "mapWidthMm" | "mapHeightMm">,
  info: DeclinationInfo,
  bearing = 0
): void {
  const box = declinationBoxRect(layout);
  const { widthMm, heightMm } = DECLINATION_BOX;

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);
  pdf.rect(box.left, box.top, widthMm, heightMm, "FD");

  // Diagram on the left: lines of length L from a common origin. The origin is
  // placed so the whole rotated drawing (incl. "N" label) stays inside the box,
  // whatever the map bearing is.
  const L = 13;
  const LABEL = L + 2.2;
  const dir = (trueBearingDeg: number) => {
    const a = ((trueBearingDeg - bearing) * Math.PI) / 180; // clockwise from paper-up
    return { x: Math.sin(a), y: -Math.cos(a) };
  };
  const extents = [dir(0), dir(info.declination), ...(info.convergence !== null ? [dir(info.convergence)] : [])];
  const pts = [{ x: 0, y: 0 }, ...extents.map((d) => ({ x: d.x * L, y: d.y * L })), { x: dir(0).x * LABEL, y: dir(0).y * LABEL }];
  const pad = 1;
  const minX = Math.min(...pts.map((q) => q.x)) - pad;
  const maxX = Math.max(...pts.map((q) => q.x)) + pad;
  const minY = Math.min(...pts.map((q) => q.y)) - pad;
  const maxY = Math.max(...pts.map((q) => q.y)) + pad;
  const area = { left: box.left + 1.5, right: box.left + 19.5, top: box.top + 1.5, bottom: box.bottom - 5.5 };
  // Centre the drawing in the area, then clamp so it never crosses the area edges.
  const place = (lo: number, hi: number, min: number, max: number) =>
    Math.min(Math.max(lo - min + (hi - lo - (max - min)) / 2, lo - min), hi - max);
  const ox = place(area.left, area.right, minX, maxX);
  const oy = place(area.top, area.bottom, minY, maxY);
  const tipOf = (deg: number, len = L) => {
    const d = dir(deg);
    return { x: ox + d.x * len, y: oy + d.y * len };
  };

  pdf.setTextColor(0);
  pdf.setDrawColor(0);

  // True north: solid line with filled head and "N".
  const tn = tipOf(0);
  pdf.setLineWidth(0.4);
  pdf.line(ox, oy, tn.x, tn.y);
  const hb = tipOf(0, L - 3);
  const dn = dir(0);
  const px = -dn.y;
  const py = dn.x;
  pdf.setFillColor(0, 0, 0);
  pdf.triangle(tn.x, tn.y, hb.x + px * 0.9, hb.y + py * 0.9, hb.x - px * 0.9, hb.y - py * 0.9, "F");
  const nl = tipOf(0, LABEL);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.text("N", nl.x, nl.y + 1, { align: "center" });
  pdf.setFont("helvetica", "normal");

  // Grid north: dashed line.
  if (info.convergence !== null) {
    const gn = tipOf(info.convergence);
    pdf.setLineWidth(0.25);
    pdf.setLineDashPattern([1, 0.8], 0);
    pdf.line(ox, oy, gn.x, gn.y);
    pdf.setLineDashPattern([], 0);
  }

  // Magnetic north: line with a half arrowhead (harpoon).
  const mn = tipOf(info.declination);
  pdf.setLineWidth(0.25);
  pdf.line(ox, oy, mn.x, mn.y);
  const mb = tipOf(info.declination, L - 3);
  const dm = dir(info.declination);
  pdf.setLineWidth(0.3);
  pdf.line(mn.x, mn.y, mb.x + -dm.y * 1.2, mb.y + dm.x * 1.2);

  // Text on the right: three rows with line samples.
  const tx = box.left + 25;
  const sx = tx - 1.8;
  const rows: Array<{ label: string; value: string; style: "tn" | "gn" | "mn" }> = [
    { label: "Retvisende nord", value: "", style: "tn" },
  ];
  if (info.convergence !== null) {
    rows.push({ label: "Gitternord", value: formatDeclination(info.convergence), style: "gn" });
  }
  rows.push({ label: "Magnetisk nord", value: formatDeclination(info.declination), style: "mn" });

  pdf.setFontSize(6);
  let y = box.top + 5;
  for (const r of rows) {
    pdf.setLineWidth(r.style === "tn" ? 0.4 : 0.25);
    if (r.style === "gn") pdf.setLineDashPattern([1, 0.8], 0);
    pdf.line(sx - 3, y - 0.8, sx, y - 0.8);
    pdf.setLineDashPattern([], 0);
    pdf.setFont("helvetica", "bold");
    pdf.text(r.label, tx, y - 0.6);
    pdf.setFont("helvetica", "normal");
    if (r.value) pdf.text(r.value, tx, y + 2.1);
    y += r.value ? 6.2 : 4;
  }
  pdf.setFontSize(4.5);
  pdf.setTextColor(90);
  pdf.text(`Misvisning ${info.year} (${WMM_MODEL}), ikke i målestok`, box.left + 2, box.bottom - 1.2);
  pdf.setTextColor(0);
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.2);
}
