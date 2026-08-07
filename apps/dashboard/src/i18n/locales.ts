export const LOCALES = ["en", "am"] as const;

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "am";
}

/** BCP 47 tag for Intl formatters. */
export function toIntlLocale(locale: Locale): string {
  return locale === "am" ? "am-ET" : "en";
}
