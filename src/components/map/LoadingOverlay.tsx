"use client";

import { usePrintStore } from "@/stores/printStore";

export function LoadingOverlay() {
  const isGenerating = usePrintStore((s) => s.isGenerating);

  if (!isGenerating) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="rounded-xl bg-white px-8 py-6 text-center shadow-lg">
        <svg
          className="mx-auto mb-3 h-8 w-8 animate-spin text-primary"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-sm font-medium text-gray-700">Genererer PDF...</p>
        <p className="text-xs text-gray-400 mt-1">Dette kan tage et ojeblik</p>
      </div>
    </div>
  );
}
