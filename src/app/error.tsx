"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging; replace with real reporting if added.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center px-6 max-w-md">
        <h1 className="text-4xl font-bold text-primary mb-4">Noget gik galt</h1>
        <p className="text-lg text-text-secondary mb-8">
          Der opstod en uventet fejl. Prøv igen, eller genindlæs siden.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover transition-colors"
          >
            Prøv igen
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface-secondary transition-colors"
          >
            Tilbage til kortet
          </Link>
        </div>
      </div>
    </div>
  );
}
