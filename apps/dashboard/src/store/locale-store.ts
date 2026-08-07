import { create } from "zustand";

import type { Locale } from "@/i18n";
import { applyLocale, loadLocale, saveLocale } from "@/lib/settings";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  hydrate: () => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "en",
  setLocale(locale) {
    applyLocale(locale);
    saveLocale(locale);
    set({ locale });
  },
  hydrate() {
    const locale = loadLocale();
    applyLocale(locale);
    set({ locale });
  },
}));
