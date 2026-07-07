"use client";

interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleProps {
  label: string;
  value: string;
  options: ToggleOption[];
  onChange: (value: string) => void;
}

export function Toggle({ label, value, options, onChange }: ToggleProps) {
  return (
    <div>
      <span className="block text-sm font-medium mb-1">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-border overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              value === opt.value
                ? "bg-primary text-on-primary"
                : "bg-surface text-foreground hover:bg-surface-secondary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
