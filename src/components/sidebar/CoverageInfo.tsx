"use client";

import { usePrintStore } from "@/stores/printStore";
import { calculatePrintArea } from "@/lib/geo/calculations";

/** Format a ground distance in metres as a compact Danish string (m / km). */
function formatGround(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString("da-DK", {
    maximumFractionDigits: 1,
  })} km`;
}

/**
 * Derived readout that ties scale + paper format + orientation together, so the
 * user can see how much ground the print actually covers without doing the math.
 */
export function CoverageInfo() {
  const scale = usePrintStore((s) => s.scale);
  const paperFormat = usePrintStore((s) => s.paperFormat);
  const orientation = usePrintStore((s) => s.orientation);

  const area = calculatePrintArea(paperFormat, orientation, scale);

  return (
    <p className="text-xs text-text-secondary -mt-1">
      Dækker ca.{" "}
      <span className="font-medium text-foreground">
        {formatGround(area.groundWidthM)} × {formatGround(area.groundHeightM)}
      </span>{" "}
      på kortet
    </p>
  );
}
