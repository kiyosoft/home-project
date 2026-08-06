import { create } from "zustand";

import {
  applyTheme,
  loadTheme,
  saveTheme,
  type ThemeMode,
} from "@/lib/settings";

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light",
  setTheme(theme) {
    applyTheme(theme);
    saveTheme(theme);
    set({ theme });
  },
  hydrate() {
    const theme = loadTheme();
    applyTheme(theme);
    set({ theme });
  },
}));
