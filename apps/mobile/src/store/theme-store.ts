import { Uniwind } from "uniwind";
import { create } from "zustand";

import {
  loadTheme,
  saveTheme,
  type ThemePreference,
} from "@/lib/settings";

interface ThemeState {
  preference: ThemePreference;
  hydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",
  hydrated: false,

  setPreference(preference) {
    Uniwind.setTheme(preference);
    set({ preference });
    void saveTheme(preference);
  },

  async hydrate() {
    const preference = await loadTheme();
    Uniwind.setTheme(preference);
    set({ preference, hydrated: true });
  },
}));
