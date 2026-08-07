import { am } from "./messages/am";
import { en, type MessageKey } from "./messages/en";
import type { Locale } from "./locales";

export type { Locale, MessageKey };
export { LOCALES, isLocale, toIntlLocale } from "./locales";

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en,
  am,
};

export type TranslateParams = Record<string, string | number>;

export function t(
  locale: Locale,
  key: MessageKey,
  params?: TranslateParams,
): string {
  const catalog = catalogs[locale] ?? catalogs.en;
  let value = catalog[key] ?? catalogs.en[key] ?? key;
  if (params) {
    for (const [name, raw] of Object.entries(params)) {
      value = value.replaceAll(`{${name}}`, String(raw));
    }
  }
  return value;
}
