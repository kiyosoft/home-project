import type { TimeFormat } from "@/dashboard/types";

export function formatHeaderDate(date: Date, locale = navigator.language): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
    .format(date)
    .toUpperCase();
}

export function formatHeaderTime(
  date: Date,
  timeFormat: TimeFormat,
  locale = navigator.language,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  }).format(date);
}
