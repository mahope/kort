import type { PrintFrameBounds } from "@/types/print";

/** Grows the bounds by `ratio` of their width/height on every side. */
export function padBounds(bounds: PrintFrameBounds, ratio: number): PrintFrameBounds {
  const dx = (bounds.east - bounds.west) * ratio;
  const dy = (bounds.north - bounds.south) * ratio;
  return {
    west: bounds.west - dx,
    east: bounds.east + dx,
    south: bounds.south - dy,
    north: bounds.north + dy,
  };
}
