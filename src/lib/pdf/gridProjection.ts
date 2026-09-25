import type { PdfLayout, PrintFrameBounds } from "@/types/print";

const D2R = Math.PI / 180;

/** Web Mercator y in "degree" units, so it is comparable to longitude. */
export function mercY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2)) / D2R;
}

export function invMercY(y: number): number {
  return (2 * Math.atan(Math.exp(y * D2R)) - Math.PI / 2) / D2R;
}

export interface PaperProjector {
  /** lng/lat → mm on the PDF page */
  toMm: (lng: number, lat: number) => { x: number; y: number };
  /** mm on the PDF page → lng/lat */
  fromMm: (x: number, y: number) => { lng: number; lat: number };
}

/**
 * Maps geographic coordinates to millimetres on the PDF page exactly the way
 * the renderer (renderer.ts) frames the map image: Web Mercator, fitted to the
 * bounds when bearing is 0, otherwise centred at the bounds centre with the
 * bounds' longitude span across the map width and rotated by the bearing.
 */
export function createPaperProjector(
  bounds: PrintFrameBounds,
  layout: Pick<PdfLayout, "marginMm" | "mapWidthMm" | "mapHeightMm">,
  bearing = 0
): PaperProjector {
  const cx = layout.marginMm + layout.mapWidthMm / 2;
  const cy = layout.marginMm + layout.mapHeightMm / 2;
  const cLng = (bounds.west + bounds.east) / 2;
  const lngSpan = bounds.east - bounds.west;

  let k: number;
  let cMy: number;
  if (bearing === 0) {
    const ySpan = mercY(bounds.north) - mercY(bounds.south);
    k = Math.min(layout.mapWidthMm / lngSpan, layout.mapHeightMm / ySpan);
    cMy = (mercY(bounds.north) + mercY(bounds.south)) / 2;
  } else {
    k = layout.mapWidthMm / lngSpan;
    cMy = mercY((bounds.north + bounds.south) / 2);
  }

  // MapLibre rotates the world by -bearing on screen.
  const th = -bearing * D2R;
  const cos = Math.cos(th);
  const sin = Math.sin(th);

  return {
    toMm(lng, lat) {
      const dx = (lng - cLng) * k;
      const dy = -(mercY(lat) - cMy) * k;
      return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
    },
    fromMm(x, y) {
      const rx = x - cx;
      const ry = y - cy;
      const dx = rx * cos + ry * sin;
      const dy = -rx * sin + ry * cos;
      return { lng: cLng + dx / k, lat: invMercY(cMy - dy / k) };
    },
  };
}
