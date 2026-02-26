"use client";

import { usePrintStore } from "@/stores/printStore";
import { generatePdf } from "@/lib/pdf/generator";

export function PrintButton() {
  const { frameBounds, scale, paperFormat, orientation, isGenerating, setIsGenerating } =
    usePrintStore();

  const handleClick = async () => {
    if (!frameBounds || isGenerating) return;
    setIsGenerating(true);
    try {
      await generatePdf({ bounds: frameBounds, scale, paperFormat, orientation });
    } catch (err) {
      alert(
        `Fejl ved PDF-generering: ${err instanceof Error ? err.message : "Ukendt fejl"}`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isGenerating || !frameBounds}
      className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isGenerating ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
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
          Genererer PDF...
        </span>
      ) : (
        "Download PDF"
      )}
    </button>
  );
}
