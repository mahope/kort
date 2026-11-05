import type { PaperFormat, Orientation, DpiOption } from "@/types/print";
import { PAPER_FORMATS } from "@/constants/paperFormats";
import { calculatePdfLayout } from "./layout";

// WebGL guarantees at least 4096 for texture/renderbuffer size on all but the
// oldest devices; used when no GL context can be created.
const FALLBACK_MAX_SIZE = 4096;

const DPI_OPTIONS: DpiOption[] = [150, 200, 300];

/**
 * Largest canvas edge (px) the device can render, from the smaller of
 * MAX_TEXTURE_SIZE, MAX_RENDERBUFFER_SIZE and MAX_VIEWPORT_DIMS.
 */
export function getMaxCanvasSize(): number {
  if (typeof document === "undefined") return FALLBACK_MAX_SIZE;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return FALLBACK_MAX_SIZE;
    const sizes = [gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)];
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as ArrayLike<number> | null;
    if (viewport) sizes.push(viewport[0], viewport[1]);
    const valid = sizes.filter((n): n is number => typeof n === "number" && n > 0);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return valid.length > 0 ? Math.min(...valid) : FALLBACK_MAX_SIZE;
  } catch {
    return FALLBACK_MAX_SIZE;
  }
}

/**
 * Highest DPI (<= requestedDpi) at which the map canvas for this paper fits
 * within maxSize on both edges. Returns requestedDpi when nothing is lost.
 */
export function effectiveDpi(
  format: PaperFormat,
  orientation: Orientation,
  requestedDpi: number,
  maxSize: number
): number {
  const { canvasWidth, canvasHeight } = calculatePdfLayout(format, orientation, requestedDpi);
  const longest = Math.max(canvasWidth, canvasHeight);
  if (longest <= maxSize) return requestedDpi;
  // Pixel sizes are rounded by the layout, so step down until the canvas fits.
  let dpi = Math.floor((requestedDpi * maxSize) / longest);
  while (dpi > 1) {
    const l = calculatePdfLayout(format, orientation, dpi);
    if (Math.max(l.canvasWidth, l.canvasHeight) <= maxSize) break;
    dpi--;
  }
  return dpi;
}

/** Find the paper format and DPI a canvas size was derived from, if any. */
export function inferPaper(
  canvasWidth: number,
  canvasHeight: number
): { format: PaperFormat; orientation: Orientation; dpi: DpiOption } | null {
  for (const format of Object.keys(PAPER_FORMATS) as PaperFormat[]) {
    for (const orientation of ["portrait", "landscape"] as Orientation[]) {
      for (const dpi of DPI_OPTIONS) {
        const l = calculatePdfLayout(format, orientation, dpi);
        if (l.canvasWidth === canvasWidth && l.canvasHeight === canvasHeight) {
          return { format, orientation, dpi };
        }
      }
    }
  }
  return null;
}

/** Danish error text when the requested canvas exceeds the device limit. */
export function canvasLimitMessage(canvasWidth: number, canvasHeight: number, maxSize: number): string {
  const paper = inferPaper(canvasWidth, canvasHeight);
  if (paper) {
    const dpi = effectiveDpi(paper.format, paper.orientation, paper.dpi, maxSize);
    return `${paper.format} kan højst udskrives med ca. ${dpi} dpi på denne enhed (${paper.dpi} dpi er valgt). Vælg en lavere DPI eller et mindre format.`;
  }
  const dpiPercent = Math.floor((maxSize / Math.max(canvasWidth, canvasHeight)) * 100);
  return `Kortet kræver ${canvasWidth} x ${canvasHeight} px, men denne enhed kan højst ${maxSize} px. Vælg en lavere DPI eller et mindre format (højst ca. ${dpiPercent} % af den valgte opløsning).`;
}
