"use client";

import { useState } from "react";
import { usePrintStore } from "@/stores/printStore";
import { SCALE_PRESETS, MIN_CUSTOM_SCALE, MAX_CUSTOM_SCALE } from "@/constants/scales";
import { ChipGroup } from "@/components/ui/ChipGroup";

const CUSTOM_VALUE = "custom";

export function ScaleSelector() {
  const scale = usePrintStore((s) => s.scale);
  const setScale = usePrintStore((s) => s.setScale);
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPreset = SCALE_PRESETS.some((p) => p.value === scale);

  const handleChange = (value: string) => {
    if (value === CUSTOM_VALUE) {
      setIsCustom(true);
      setCustomInput(String(scale));
      setError(null);
    } else {
      setIsCustom(false);
      setError(null);
      setScale(Number(value));
    }
  };

  const handleCustomSubmit = () => {
    const num = parseInt(customInput.replace(/\./g, ""), 10);
    if (isNaN(num) || num < MIN_CUSTOM_SCALE || num > MAX_CUSTOM_SCALE) {
      setError(`Skal være mellem 1:${MIN_CUSTOM_SCALE.toLocaleString("da-DK")} og 1:${MAX_CUSTOM_SCALE.toLocaleString("da-DK")}`);
      return;
    }
    setError(null);
    setScale(num);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCustomSubmit();
  };

  const selectValue = isCustom || !isPreset ? CUSTOM_VALUE : String(scale);

  return (
    <div>
      <ChipGroup
        label="Målestok"
        hint="1:"
        value={selectValue}
        onChange={handleChange}
        options={[
          ...SCALE_PRESETS.map((s) => ({
            value: String(s.value),
            label: s.value.toLocaleString("da-DK"),
            ariaLabel: s.label,
          })),
          { value: CUSTOM_VALUE, label: "Andet", ariaLabel: "Andet (brugerdefineret målestok)" },
        ]}
      />

      {(isCustom || !isPreset) && (
        <div className="mt-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-text-secondary">1:</span>
            <input
              aria-label="Brugerdefineret målestok (nævner)"
              type="text"
              inputMode="numeric"
              value={customInput || (!isPreset ? String(scale) : "")}
              onChange={(e) => {
                setCustomInput(e.target.value);
                setError(null);
              }}
              onBlur={handleCustomSubmit}
              onKeyDown={handleKeyDown}
              placeholder="f.eks. 15000"
              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm pointer-coarse:min-h-11 pointer-coarse:text-base bg-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {error && (
            <p className="mt-1 text-xs text-danger">{error}</p>
          )}
          {!isPreset && !error && (
            <p className="mt-1 text-xs text-text-muted">
              Aktuel: 1:{scale.toLocaleString("da-DK")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
