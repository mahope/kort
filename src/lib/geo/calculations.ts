import type {
  PaperFormat,
  Orientation,
  PrintArea,
  PrintFrameBounds,
  PageCell,
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

/**
 * Calculate a multi-page grid of print cells.
 * Each cell has bounds that overlap slightly with its neighbors.
 */
export function calculateMultiPageGrid(
  centerLng: number,
  centerLat: number,
  format: PaperFormat,
  orientation: Orientation,
  scale: number,
  overlapMm: number,
  gridCols: number,
  gridRows: number
): { cells: PageCell[]; totalBounds: PrintFrameBounds } {
  const area = calculatePrintArea(format, orientation, scale);
  const pageGroundW = area.groundWidthM;
  const pageGroundH = area.groundHeightM;
  const overlapM = (overlapMm * scale) / 1000;

  // Effective step per cell (minus overlap)
  const stepW = pageGroundW - overlapM;
  const stepH = pageGroundH - overlapM;

  // Total ground extent
  const totalGroundW = pageGroundW + (gridCols - 1) * stepW;
  const totalGroundH = pageGroundH + (gridRows - 1) * stepH;

  const totalBounds = groundExtentToBounds(centerLng, centerLat, totalGroundW, totalGroundH);

  const latRad = (centerLat * Math.PI) / 180;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(latRad);

  const cells: PageCell[] = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const label = `${String.fromCharCode(65 + row)}${col + 1}`;

      // Offset from top-left corner
      const offsetW = col * stepW;
      const offsetH = row * stepH;

      // Cell center in meters from total top-left
      const cellCenterW = offsetW + pageGroundW / 2;
      const cellCenterH = offsetH + pageGroundH / 2;

      // Convert to degrees from total center
      const dLng = (cellCenterW - totalGroundW / 2) / metersPerDegreeLng;
      const dLat = -(cellCenterH - totalGroundH / 2) / metersPerDegreeLat; // negative because lat increases north

      const cellBounds = groundExtentToBounds(
        centerLng + dLng,
        centerLat + dLat,
        pageGroundW,
        pageGroundH
      );

      cells.push({ row, col, label, bounds: cellBounds });
    }
  }

  return { cells, totalBounds };
}
