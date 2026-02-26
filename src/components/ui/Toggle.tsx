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
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              value === opt.value
                ? "bg-primary text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
