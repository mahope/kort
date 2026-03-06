"use client";

import { usePrintStore } from "@/stores/printStore";

export function LoadingOverlay() {
  const isGenerating = usePrintStore((s) => s.isGenerating);
  const generatingPage = usePrintStore((s) => s.generatingPage);
  const totalPages = usePrintStore((s) => s.totalPages);

  if (!isGenerating) return null;

  const isMultiPage = totalPages > 1;
  const progress = isMultiPage ? Math.round((generatingPage / totalPages) * 100) : 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="rounded-xl bg-surface px-8 py-6 text-center shadow-lg min-w-[220px]">
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
        <p className="text-sm font-medium text-foreground">
          {isMultiPage
            ? `Renderer side ${generatingPage} af ${totalPages}...`
            : "Genererer PDF..."}
        </p>
        {isMultiPage && (
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-1.5">{progress}%</p>
          </div>
        )}
        {!isMultiPage && (
          <p className="text-xs text-text-muted mt-1">Dette kan tage et ojeblik</p>
        )}
      </div>
    </div>
  );
}
