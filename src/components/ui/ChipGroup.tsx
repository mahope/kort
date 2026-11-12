"use client";

import { useId, useRef } from "react";

export interface ChipOption {
  value: string;
  label: string;
  /** Accessible name when the visible label is abbreviated. */
  ariaLabel?: string;
}

interface ChipGroupProps {
  label: string;
  /** Text shown after the label, e.g. the unit or prefix of the chips. */
  hint?: string;
  value: string;
  options: ChipOption[];
  onChange: (value: string) => void;
  columns?: 3 | 4 | 5;
}

/**
 * A radiogroup of large chips: every option is visible and tappable at once
 * (44 px on touch), instead of a native select that hides the choices.
 * Arrow keys move the selection like native radio buttons.
 */
export function ChipGroup({ label, hint, value, options, onChange, columns = 4 }: ChipGroupProps) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <span id={labelId} className="block text-sm font-medium mb-1">
        {label}
        {hint && <span className="ml-1 font-normal text-text-muted">{hint}</span>}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className={`grid gap-1.5 ${columns === 3 ? "grid-cols-3" : columns === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
        {options.map((opt, i) => {
          const checked = opt.value === value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={opt.ariaLabel}
              tabIndex={checked || (selectedIndex < 0 && i === 0) ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`min-h-9 rounded-lg border px-0.5 text-sm font-medium tabular-nums md:text-[13px] md:tracking-tight transition-colors pointer-coarse:min-h-11 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                checked
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border bg-surface text-foreground hover:bg-surface-secondary"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
