"use client";

import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import {
  GRID_SPACINGS,
  formatSpacing,
  resolvePrintSpacing,
  type GridSpacing,
  type GridLabelFormat,
  type UtmZoneMode,
} from "@/lib/geo/utmGrid";

const SPACING_OPTIONS: { value: string; label: string }[] = [
  { value: "auto", label: "Auto" },
  ...GRID_SPACINGS.map((s) => ({ value: String(s), label: formatSpacing(s) })),
];

function formatCm(mm: number): string {
  const cm = mm / 10;
  return `${cm.toLocaleString("da-DK", { maximumFractionDigits: 1 })} cm`;
}

/**
 * UTM grid on/off plus its options: spacing, edge coordinates, number format
 * and zone. The options only show while the grid is on, to keep the sidebar calm.
 */
export function UtmGridSettings() {
  const showUtmGrid = useMapStore((s) => s.showUtmGrid);
  const toggleUtmGrid = useMapStore((s) => s.toggleUtmGrid);
  const gridSpacing = useMapStore((s) => s.gridSpacing);
  const setGridSpacing = useMapStore((s) => s.setGridSpacing);
  const showGridLabels = useMapStore((s) => s.showGridLabels);
  const setShowGridLabels = useMapStore((s) => s.setShowGridLabels);
  const gridLabelFormat = useMapStore((s) => s.gridLabelFormat);
  const setGridLabelFormat = useMapStore((s) => s.setGridLabelFormat);
  const utmZoneMode = useMapStore((s) => s.utmZoneMode);
  const setUtmZoneMode = useMapStore((s) => s.setUtmZoneMode);
  const scale = usePrintStore((s) => s.scale);

  const print = resolvePrintSpacing(gridSpacing, scale);
  const scaleText = `1:${scale.toLocaleString("da-DK")}`;
  let printHint: string;
  if (!print.spacing) {
    printHint = `For tæt til print ved ${scaleText}.`;
  } else if (print.coarsened && print.requested) {
    printHint = `${formatSpacing(print.requested)} er for tæt ved ${scaleText} – printes som ${formatSpacing(print.spacing)} (${formatCm((print.spacing * 1000) / scale)}).`;
  } else {
    printHint = `Print: ${formatSpacing(print.spacing)} = ${formatCm((print.spacing * 1000) / scale)} på papiret ved ${scaleText}.`;
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showUtmGrid}
          onChange={toggleUtmGrid}
          className="accent-primary"
        />
        <span className="text-sm">UTM-gitter</span>
      </label>

      {showUtmGrid && (
        <div className="ml-6 space-y-2" data-testid="utm-grid-settings">
          <div className="flex items-center gap-2">
            <label htmlFor="utm-grid-spacing" className="text-sm shrink-0">
              Gitterstørrelse
            </label>
            <select
              id="utm-grid-spacing"
              value={String(gridSpacing)}
              onChange={(e) => {
                const v = e.target.value;
                setGridSpacing(v === "auto" ? "auto" : (Number(v) as GridSpacing));
              }}
              className="min-w-0 flex-1 rounded-lg border border-border px-2 py-1.5 text-sm bg-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SPACING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <p className={`text-[11px] leading-snug ${print.coarsened ? "text-amber-700 dark:text-amber-400" : "text-text-muted"}`}>
            {printHint}
            {gridSpacing === "auto" && " På skærmen følger gitteret zoom."}
            {" "}Hver 10 km-linje er kraftigere.
          </p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showGridLabels}
              onChange={(e) => setShowGridLabels(e.target.checked)}
              className="accent-primary"
            />
            <span className="text-sm">Koordinater langs kanten</span>
          </label>

          {showGridLabels && (
            <div role="radiogroup" aria-label="Talformat" className="flex rounded-lg border border-border overflow-hidden">
              {(
                [
                  { value: "short", label: "Kort", example: <><sup>5</sup>92</> },
                  { value: "full", label: "Fuld km", example: <>592</> },
                ] as { value: GridLabelFormat; label: string; example: React.ReactNode }[]
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={gridLabelFormat === o.value}
                  onClick={() => setGridLabelFormat(o.value)}
                  className={`flex-1 px-2 py-1.5 text-sm transition-colors ${
                    gridLabelFormat === o.value
                      ? "bg-primary text-on-primary"
                      : "bg-surface text-foreground hover:bg-surface-secondary"
                  }`}
                >
                  {o.label} <span className="tabular-nums font-semibold">({o.example})</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <label htmlFor="utm-zone-mode" className="text-sm shrink-0">
              Zone
            </label>
            <select
              id="utm-zone-mode"
              value={utmZoneMode}
              onChange={(e) => setUtmZoneMode(e.target.value as UtmZoneMode)}
              className="min-w-0 flex-1 rounded-lg border border-border px-2 py-1.5 text-sm bg-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="dk">32 – hele Danmark</option>
              <option value="std">Som GPS (33 på Bornholm)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
