import type { TimeFormat } from "@/dashboard/types";
import { toIntlLocale, type Locale } from "@/i18n";

export function formatHeaderDate(date: Date, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
    .format(date)
    .toUpperCase();
}

export function formatHeaderDateShort(
  date: Date,
  locale: Locale = "en",
): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatHeaderTime(
  date: Date,
  timeFormat: TimeFormat,
  locale: Locale = "en",
): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  }).format(date);
}
