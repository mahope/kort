"use client";

import { useEffect } from "react";
import { useUiStore, type ToastMessage } from "@/stores/uiStore";

const ICONS: Record<ToastMessage["type"], React.ReactNode> = {
  success: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  ),
  error: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  ),
  info: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    if (toast.duration === 0) return;
    const timer = setTimeout(onDismiss, toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-primary",
  };

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={`${colors[toast.type]} text-white rounded-lg px-4 py-3 shadow-lg text-sm flex items-start gap-2.5 max-w-sm animate-slide-in`}
    >
      <svg className="h-5 w-5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        {ICONS[toast.type]}
      </svg>
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 -m-1 p-1 opacity-70 hover:opacity-100"
        aria-label="Luk"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    // Top-right on mobile (clears the bottom sheet), bottom-right on desktop.
    <div
      className="fixed top-4 right-4 left-4 sm:left-auto md:top-auto md:bottom-4 z-[60] flex flex-col gap-2 items-end"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
