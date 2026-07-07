"use client";

import { usePrintStore } from "@/stores/printStore";
import { generatePdf } from "@/lib/pdf/generator";
import { trackEvent } from "@/lib/analytics";
import { useUiStore } from "@/stores/uiStore";

export function PrintButton() {
  const { frameBounds, scale, paperFormat, orientation, dpi, isGenerating, setIsGenerating, generatingPage, totalPages } =
    usePrintStore();
  const addToast = useUiStore((s) => s.addToast);

  const handleClick = async () => {
    if (!frameBounds || isGenerating) return;
    setIsGenerating(true);
    try {
      await generatePdf({ bounds: frameBounds, scale, paperFormat, orientation, dpi });
      trackEvent("PDF Download", { scale: `1:${scale}`, format: paperFormat, orientation });
      addToast("success", "PDF downloadet!");
    } catch (err) {
      addToast("error", `Fejl ved PDF-generering: ${err instanceof Error ? err.message : "Ukendt fejl"}`, 8000);
    } finally {
      setIsGenerating(false);
    }
  };

  const noArea = !frameBounds;

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isGenerating || noArea}
        title={noArea ? "Vælg et område på kortet først" : undefined}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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
            {generatingPage > 0 ? `Side ${generatingPage} af ${totalPages}...` : "Genererer PDF..."}
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download PDF
          </>
        )}
      </button>
      {noArea && !isGenerating && (
        <p className="mt-1.5 text-center text-xs text-text-muted">
          Vælg et område på kortet for at udskrive
        </p>
      )}
    </div>
  );
}
