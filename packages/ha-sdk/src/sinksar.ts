import type { HassEntity } from "./types";

export interface SinksarEntry {
  title: string;
  type?: string;
  order?: number;
  story?: string;
  arke: string[];
}

export interface SinksarView {
  entityId: string;
  primaryTitle: string | undefined;
  dayOfYear: number | undefined;
  /** Ethiopian month and day, e.g. "መስከረም 1". */
  dateLabel: string | undefined;
  topStory: string | undefined;
  topArke: string[];
  entries: SinksarEntry[];
}

const ETHIOPIAN_MONTHS = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜን",
] as const;

/**
 * Sinksar's day_of_year is 1 on መስከረም 1. Twelve months of 30 days, then ጳጉሜን.
 */
export function ethiopianDateFromDayOfYear(
  dayOfYear: number,
): { month: number; day: number; monthName: string } | undefined {
  const day = Math.round(dayOfYear);
  if (!Number.isInteger(day) || day < 1 || day > 366) return undefined;
  if (day <= 360) {
    const monthIndex = Math.floor((day - 1) / 30);
    const monthName = ETHIOPIAN_MONTHS[monthIndex];
    if (!monthName) return undefined;
    return {
      month: monthIndex + 1,
      day: ((day - 1) % 30) + 1,
      monthName,
    };
  }
  return { month: 13, day: day - 360, monthName: ETHIOPIAN_MONTHS[12] };
}

export function formatEthiopianDayOfYear(dayOfYear: number): string | undefined {
  const date = ethiopianDateFromDayOfYear(dayOfYear);
  if (!date) return undefined;
  return `${date.monthName} ${date.day}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(attrs: Record<string, unknown>, key: string): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function num(attrs: Record<string, unknown>, key: string): number | undefined {
  const value = attrs[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function parseArke(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim());
}

function parseEntries(
  attrs: Record<string, unknown>,
  topStory?: string,
  topArke: string[] = [],
): SinksarEntry[] {
  const value = attrs.entries;
  if (!Array.isArray(value)) return [];
  const entries: SinksarEntry[] = [];
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) continue;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) continue;
    const type =
      typeof item.type === "string" && item.type.trim()
        ? item.type.trim()
        : undefined;
    const order =
      typeof item.order === "number" && Number.isFinite(item.order)
        ? item.order
        : undefined;
    const entryStory =
      typeof item.story === "string" && item.story.trim()
        ? item.story.trim()
        : undefined;
    const entryArke = parseArke(item.arke);
    entries.push({
      title,
      type,
      order,
      story: entryStory ?? (index === 0 ? topStory : undefined),
      arke: entryArke.length > 0 ? entryArke : index === 0 ? topArke : [],
    });
  }
  return entries;
}

/** True for the Ethiopian Orthodox synaxarium sensor, not ordinary sensors. */
export function isSinksarEntity(entity: HassEntity): boolean {
  const id = entity.entity_id;
  if (!id.startsWith("sensor.")) return false;
  if (id.includes("sinksar")) return true;
  const attrs = entity.attributes;
  if (!Array.isArray(attrs.entries)) return false;
  return (
    attrs.day_of_year != null ||
    Array.isArray(attrs.arke) ||
    typeof attrs.story === "string"
  );
}

export function deriveSinksar(entity: HassEntity | undefined): SinksarView | null {
  if (!entity) return null;
  const attrs = entity.attributes;
  const primaryTitle =
    entity.state && entity.state !== "unknown" && entity.state !== "unavailable"
      ? entity.state
      : undefined;
  const topStory = str(attrs, "story");
  const topArke = parseArke(attrs.arke);
  const dayOfYear = num(attrs, "day_of_year");
  return {
    entityId: entity.entity_id,
    primaryTitle,
    dayOfYear,
    dateLabel:
      dayOfYear != null ? formatEthiopianDayOfYear(dayOfYear) : undefined,
    topStory,
    topArke,
    entries: parseEntries(attrs, topStory, topArke),
  };
}

export function sinksarPrimaryIndex(view: SinksarView): number {
  if (!view.primaryTitle) return 0;
  const found = view.entries.findIndex((entry) => entry.title === view.primaryTitle);
  return found >= 0 ? found : 0;
}

export function sinksarStory(
  view: SinksarView,
  index: number,
): string | undefined {
  const entry = view.entries[index];
  if (entry?.story) return entry.story;
  if (index === 0) return view.topStory;
  return undefined;
}

export function sinksarArke(view: SinksarView, index: number): string[] {
  const entry = view.entries[index];
  if (entry && entry.arke.length > 0) return entry.arke;
  if (index === 0) return view.topArke;
  return [];
}
