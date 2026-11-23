"use client";

import { useId } from "react";
import { useMapStore } from "@/stores/mapStore";
import { OVERLAY_LABELS, overlayInMenu } from "@/lib/map/sources";
import { SOEKORT_VARIANT_LABELS, type SoekortVariant } from "@/lib/map/soekortStyle";
import { useMapRegion } from "@/lib/hooks/useMapRegion";
import { SeaNotice } from "@/components/map/SeaNotice";

const VARIANT_HINTS: Record<SoekortVariant, string> = {
  klassisk: "Fem blå toner, lavt vand mørkest.",
  lavvande: "De første 5 m meter for meter og en kurve med tal for hver meter. Til kano, kajak og jolle.",
};

/** Klassisk or lavt vand, under the søkort layer while it is on. */
export function SoekortVariantChoice() {
  const variant = useMapStore((s) => s.soekortVariant);
  const setVariant = useMapStore((s) => s.setSoekortVariant);
  const baseLayer = useMapStore((s) => s.baseLayer);
  const region = useMapRegion();
  // Both layer menus (map button and sidebar) can be open at once: one radio group each.
  const name = useId();
  return (
    <fieldset className="ml-6 mt-2 space-y-1">
      <legend className="text-xs text-text-muted">Søkortets stil</legend>
      {(Object.keys(SOEKORT_VARIANT_LABELS) as SoekortVariant[]).map((v) => (
        <label key={v} className="flex items-start gap-2 cursor-pointer pointer-coarse:min-h-11">
          <input
            type="radio"
            name={name}
            value={v}
            checked={variant === v}
            onChange={() => setVariant(v)}
            className="mt-0.5 accent-primary pointer-coarse:h-5 pointer-coarse:w-5"
          />
          <span className="text-sm">
            {SOEKORT_VARIANT_LABELS[v]}
            <span className="block text-xs text-text-secondary">{VARIANT_HINTS[v]}</span>
          </span>
        </label>
      ))}
      {(baseLayer !== "skaermkort" || region === "nordic") && (
        <p className="text-xs text-text-secondary">
          Dybdefarverne vises kun på Skærmkort. Her vises dybdekurver og tal.
        </p>
      )}
    </fieldset>
  );
}

export function OverlaySelector() {
  const overlays = useMapStore((s) => s.overlays);
  const toggleOverlay = useMapStore((s) => s.toggleOverlay);
  const setOverlayOpacity = useMapStore((s) => s.setOverlayOpacity);
  const region = useMapRegion();

  return (
    <div>
      <div className="space-y-2">
        {overlays.filter((o) => overlayInMenu(o.id, o.enabled, region)).map((overlay) => (
          <div key={overlay.id}>
            <label className="flex items-center gap-2 cursor-pointer pointer-coarse:min-h-11">
              <input
                type="checkbox"
                checked={overlay.enabled}
                onChange={() => toggleOverlay(overlay.id)}
                className="accent-primary pointer-coarse:h-5 pointer-coarse:w-5"
              />
              <span className="text-sm">{OVERLAY_LABELS[overlay.id]}</span>
            </label>
            {overlay.enabled && (
              <div className="ml-6 mt-1 flex items-center gap-2">
                <span className="text-xs text-text-muted">Gennemsigtighed</span>
                <input
                  type="range"
                  aria-label={`Gennemsigtighed: ${OVERLAY_LABELS[overlay.id]}`}
                  min={0}
                  max={1}
                  step={0.05}
                  value={overlay.opacity}
                  onChange={(e) =>
                    setOverlayOpacity(overlay.id, Number(e.target.value))
                  }
                  className="flex-1 h-1 pointer-coarse:h-11 accent-primary"
                />
                <span className="text-xs text-text-secondary w-8 text-right">
                  {Math.round(overlay.opacity * 100)}%
                </span>
              </div>
            )}
            {overlay.enabled && overlay.id === "soekort" && <SoekortVariantChoice />}
          </div>
        ))}
      </div>
      <SeaNotice />
    </div>
  );
}
