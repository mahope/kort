import { create } from "zustand";

export type Theme = "system" | "light" | "dark";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  duration?: number;
}

interface UiStore {
  sidebarOpen: boolean;
  theme: Theme;
  advancedMode: boolean;
  toasts: ToastMessage[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  hydrateTheme: () => void;
  setAdvancedMode: (v: boolean) => void;
  addToast: (type: ToastMessage["type"], message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  try { localStorage.setItem("theme", theme); } catch {}
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return null;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  // Deterministic on the server AND on first client render (the inline script in
  // layout.tsx already sets the .dark class); the real value is read from
  // localStorage post-hydration via hydrateTheme() to avoid a hydration mismatch.
  theme: "system",
  advancedMode: false,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  hydrateTheme: () => {
    const stored = getStoredTheme();
    if (stored) set({ theme: stored });
  },
  setAdvancedMode: (advancedMode) => {
    try { localStorage.setItem("advancedMode", String(advancedMode)); } catch {}
    set({ advancedMode });
  },
  addToast: (type, message, duration) =>
    set((s) => ({
      toasts: [...s.toasts, { id: crypto.randomUUID(), type, message, duration }],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
