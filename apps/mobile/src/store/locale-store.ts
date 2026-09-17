import { useCallback } from "react";
import { create } from "zustand";

import {
  t,
  type Locale,
  type MessageKey,
  type TranslateParams,
} from "@/i18n";
import {
  loadEthiopianHours,
  loadLocale,
  saveEthiopianHours,
  saveLocale,
} from "@/lib/settings";

interface LocaleState {
  locale: Locale;
  ethiopianHours: boolean;
  setLocale: (locale: Locale) => void;
  setEthiopianHours: (value: boolean) => void;
  hydrate: () => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: loadLocale(),
  ethiopianHours: loadEthiopianHours(),

  setLocale(locale) {
    set({ locale });
    saveLocale(locale);
  },

  setEthiopianHours(ethiopianHours) {
    set({ ethiopianHours });
    saveEthiopianHours(ethiopianHours);
  },

  hydrate() {
    set({ locale: loadLocale(), ethiopianHours: loadEthiopianHours() });
  },
}));

/** Translator bound to the active locale, so screens never pass it around. */
export function useT() {
  const locale = useLocaleStore((state) => state.locale);
  return useCallback(
    (key: MessageKey, params?: TranslateParams) => t(locale, key, params),
    [locale],
  );
}
