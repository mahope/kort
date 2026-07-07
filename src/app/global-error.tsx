"use client";

import { useEffect } from "react";

// Catches errors thrown in the root layout itself. Must render its own
// <html>/<body> because it replaces the entire document.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="da">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          background: "#ffffff",
          color: "#111827",
        }}
      >
        <div style={{ textAlign: "center", padding: "0 1.5rem", maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem" }}>
            Noget gik galt
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
            Der opstod en uventet fejl. Prøv igen, eller genindlæs siden.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Prøv igen
          </button>
        </div>
      </body>
    </html>
  );
}
