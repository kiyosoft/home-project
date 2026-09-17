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
  hydrate: () => void;
}

function applyTheme(preference: ThemePreference) {
  Uniwind.setTheme(preference);
  return preference;
}

const initialPreference = loadTheme();
applyTheme(initialPreference);

export const useThemeStore = create<ThemeState>((set) => ({
  preference: initialPreference,
  hydrated: true,

  setPreference(preference) {
    applyTheme(preference);
    set({ preference });
    saveTheme(preference);
  },

  hydrate() {
    const preference = applyTheme(loadTheme());
    set({ preference, hydrated: true });
  },
}));
