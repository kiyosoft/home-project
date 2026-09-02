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
  hydrate: () => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "en",
  ethiopianHours: false,

  setLocale(locale) {
    set({ locale });
    void saveLocale(locale);
  },

  setEthiopianHours(ethiopianHours) {
    set({ ethiopianHours });
    void saveEthiopianHours(ethiopianHours);
  },

  async hydrate() {
    const [locale, ethiopianHours] = await Promise.all([
      loadLocale(),
      loadEthiopianHours(),
    ]);
    set({ locale, ethiopianHours });
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
