import type {
  PaperFormat,
  Orientation,
  PrintArea,
  PrintFrameBounds,
} from "@/types/print";
import {
  PAPER_FORMATS,
  DEFAULT_MARGIN_MM,
} from "@/constants/paperFormats";

/**
 * Calculate the printable area dimensions in both mm and ground meters.
 */
export function calculatePrintArea(
  format: PaperFormat,
  orientation: Orientation,
  scale: number,
  marginMm: number = DEFAULT_MARGIN_MM
): PrintArea {
  const dims = PAPER_FORMATS[format];
  let paperWidthMm = dims.widthMm;
  let paperHeightMm = dims.heightMm;

  if (orientation === "landscape") {
    [paperWidthMm, paperHeightMm] = [paperHeightMm, paperWidthMm];
  }

  const printableWidthMm = paperWidthMm - 2 * marginMm;
  const printableHeightMm = paperHeightMm - 2 * marginMm;

  // Convert mm on paper to meters on ground: mm * scale / 1000
  const groundWidthM = (printableWidthMm * scale) / 1000;
  const groundHeightM = (printableHeightMm * scale) / 1000;

  return {
    paperWidthMm: printableWidthMm,
    paperHeightMm: printableHeightMm,
    groundWidthM,
    groundHeightM,
  };
}

/**
 * Convert a ground extent (in meters) centered on a point to lat/lng bounds.
 */
export function groundExtentToBounds(
  lng: number,
  lat: number,
  widthM: number,
  heightM: number
): PrintFrameBounds {
  const latRad = (lat * Math.PI) / 180;

  // Meters per degree
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(latRad);

  const halfWidthDeg = widthM / 2 / metersPerDegreeLng;
  const halfHeightDeg = heightM / 2 / metersPerDegreeLat;

  return {
    north: lat + halfHeightDeg,
    south: lat - halfHeightDeg,
    east: lng + halfWidthDeg,
    west: lng - halfWidthDeg,
  };
}
