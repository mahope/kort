import { create } from "zustand";

export type Theme = "system" | "light" | "dark";

interface UiStore {
  sidebarOpen: boolean;
  theme: Theme;
  advancedMode: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setAdvancedMode: (v: boolean) => void;
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
}));
