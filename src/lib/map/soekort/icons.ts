import type { Map as MaplibreMap } from "maplibre-gl";
import { SOEKORT_ICONS, SOEKORT_TOKENS } from "./style";

/**
 * The sea chart's icons (wreck, anchorage, marina), drawn on a canvas when the
 * style first asks for them. Drawing them at the target's pixels per millimetre
 * keeps them sharp in a 300 dpi PDF, and no sprite file has to be hosted.
 */
type Draw = (ctx: CanvasRenderingContext2D, s: number) => void;

const C = SOEKORT_TOKENS.colors;

/** Chart symbol for a wreck: a hull line crossed by three short masts. */
const wreck: Draw = (ctx, s) => {
  ctx.strokeStyle = C.wreck;
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(s * 0.08, s * 0.5);
  ctx.lineTo(s * 0.92, s * 0.5);
  for (const x of [0.3, 0.5, 0.7]) {
    ctx.moveTo(s * x, s * 0.32);
    ctx.lineTo(s * x, s * 0.68);
  }
  ctx.stroke();
};

function roundBadge(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = C.harbour;
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

const anchor: Draw = (ctx, s) => {
  roundBadge(ctx, s);
  ctx.strokeStyle = C.harbour;
  ctx.lineWidth = s * 0.075;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(s / 2, s * 0.27, s * 0.06, 0, Math.PI * 2); // ring
  ctx.moveTo(s / 2, s * 0.33);
  ctx.lineTo(s / 2, s * 0.76); // shank
  ctx.moveTo(s * 0.37, s * 0.42);
  ctx.lineTo(s * 0.63, s * 0.42); // stock
  ctx.moveTo(s * 0.28, s * 0.58);
  ctx.quadraticCurveTo(s * 0.32, s * 0.76, s / 2, s * 0.76); // arms
  ctx.quadraticCurveTo(s * 0.68, s * 0.76, s * 0.72, s * 0.58);
  ctx.stroke();
};

const harbour: Draw = (ctx, s) => {
  roundBadge(ctx, s);
  ctx.fillStyle = C.harbour;
  ctx.beginPath(); // sail
  ctx.moveTo(s * 0.52, s * 0.2);
  ctx.lineTo(s * 0.52, s * 0.62);
  ctx.lineTo(s * 0.3, s * 0.62);
  ctx.closePath();
  ctx.moveTo(s * 0.56, s * 0.3); // jib
  ctx.lineTo(s * 0.56, s * 0.62);
  ctx.lineTo(s * 0.7, s * 0.62);
  ctx.closePath();
  ctx.moveTo(s * 0.24, s * 0.67); // hull
  ctx.lineTo(s * 0.76, s * 0.67);
  ctx.lineTo(s * 0.66, s * 0.78);
  ctx.lineTo(s * 0.34, s * 0.78);
  ctx.closePath();
  ctx.fill();
};

const ICONS: Record<string, Draw> = {
  [SOEKORT_ICONS.wreck]: wreck,
  [SOEKORT_ICONS.anchor]: anchor,
  [SOEKORT_ICONS.harbour]: harbour,
};

/** Pixel data for one icon, or null without a 2D canvas (tests, very old browsers). */
export function drawSoekortIcon(id: string, sizePx: number): ImageData | null {
  const draw = ICONS[id];
  if (!draw || typeof document === "undefined") return null;
  const size = Math.max(8, Math.round(sizePx));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  draw(ctx, size);
  return ctx.getImageData(0, 0, size, size);
}

/**
 * Supplies the icons when MapLibre first misses them (and, after load, at once). `pxPerMm` is the style's
 * scale and `pixelRatio` the canvas' device pixel ratio (the screen's on a
 * retina display, 1 in the PDF, whose pxPerMm already holds the print dpi).
 */
export function attachSoekortIcons(map: MaplibreMap, pxPerMm: number, pixelRatio = 1): void {
  const add = (id: string) => {
    if (!(id in ICONS) || map.hasImage(id)) return;
    const data = drawSoekortIcon(id, SOEKORT_TOKENS.mm.icon * pxPerMm * pixelRatio);
    if (data) map.addImage(id, data, { pixelRatio });
  };
  // MapLibre 6: a resolver supplies the image for the current request (event listeners cannot).
  map.setMissingStyleImageResolver(add);
  // Attached after load (the live map): add them now, before any symbol needs them.
  if (map.isStyleLoaded()) for (const id of Object.keys(ICONS)) add(id);
}
