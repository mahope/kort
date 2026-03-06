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

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return "system";
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  theme: getInitialTheme(),
  advancedMode: false,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
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
