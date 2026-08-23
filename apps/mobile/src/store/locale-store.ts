import { useCallback } from "react";
import { create } from "zustand";

import {
  t,
  type Locale,
  type MessageKey,
  type TranslateParams,
} from "@/i18n";
import { loadLocale, saveLocale } from "@/lib/settings";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  hydrate: () => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "en",

  setLocale(locale) {
    set({ locale });
    void saveLocale(locale);
  },

  async hydrate() {
    set({ locale: await loadLocale() });
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
