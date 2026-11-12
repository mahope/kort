"use client";

import { useState } from "react";
import { usePrintStore } from "@/stores/printStore";
import { trackEvent } from "@/lib/analytics";
import { useUiStore } from "@/stores/uiStore";
import type { PdfProgress } from "@/lib/pdf/generator";

function progressText(progress: PdfProgress | null, page: number, totalPages: number): string {
  const pagePrefix = page > 0 ? `Side ${page} af ${totalPages}: ` : "";
  if (!progress) return page > 0 ? `Side ${page} af ${totalPages}...` : "Genererer PDF...";
  if (progress.stage === "assemble") return `${pagePrefix}samler PDF...`;
  if (progress.tilesTotal === 0) return `${pagePrefix}henter kort...`;
  return `${pagePrefix}${progress.tilesLoaded} af ${progress.tilesTotal} kortfliser`;
}

// Screen readers get a coarse update (every 10th tile) instead of one per tile.
function liveText(progress: PdfProgress | null, page: number, totalPages: number): string {
  if (progress && progress.stage !== "assemble" && progress.tilesTotal > 0) {
    const coarse = { ...progress, tilesLoaded: Math.floor(progress.tilesLoaded / 10) * 10 };
    return progressText(coarse, page, totalPages);
  }
  return progressText(progress, page, totalPages);
}

/** 0-1 share of the work done, for the bar behind the button text. */
function progressFraction(progress: PdfProgress | null, page: number, totalPages: number): number {
  let inPage = 0.05;
  if (progress?.stage === "assemble") inPage = 0.95;
  else if (progress && progress.tilesTotal > 0) inPage = 0.05 + 0.85 * (progress.tilesLoaded / progress.tilesTotal);
  if (totalPages > 1 && page > 0) return (Math.max(0, page - 1) + inPage) / totalPages;
  return inPage;
}

export function PrintButton() {
  const { frameBounds, scale, paperFormat, orientation, dpi, isGenerating, setIsGenerating, generatingPage, totalPages } =
    usePrintStore();
  const addToast = useUiStore((s) => s.addToast);
  const [progress, setProgress] = useState<PdfProgress | null>(null);

  const handleClick = async () => {
    if (!frameBounds || isGenerating) return;
    setIsGenerating(true);
    try {
      // jsPDF (~160 KB gz) is only fetched when the user actually downloads.
      const { generatePdf } = await import("@/lib/pdf/generator");
      await generatePdf({ bounds: frameBounds, scale, paperFormat, orientation, dpi, onProgress: setProgress });
      trackEvent("PDF Download", { scale: `1:${scale}`, format: paperFormat, orientation });
      addToast("success", "PDF downloadet!");
    } catch (err) {
      addToast("error", `Fejl ved PDF-generering: ${err instanceof Error ? err.message : "Ukendt fejl"}`, 8000);
    } finally {
      setIsGenerating(false);
      setProgress(null);
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
        className="relative flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-4 py-3 text-base font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 data-[busy=true]:opacity-100 md:text-sm"
        data-busy={isGenerating}
      >
        {isGenerating ? (
          <>
            <span
              aria-hidden="true"
              data-testid="pdf-progress-bar"
              className="absolute inset-y-0 left-0 bg-on-primary/20 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round(progressFraction(progress, generatingPage, totalPages) * 100)}%` }}
            />
            <svg className="relative animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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
            <span aria-hidden="true" className="relative tabular-nums">{progressText(progress, generatingPage, totalPages)}</span>
            <span role="status" className="sr-only">{liveText(progress, generatingPage, totalPages)}</span>
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
