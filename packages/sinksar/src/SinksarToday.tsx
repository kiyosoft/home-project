import { useState } from "react";
import { z } from "zod";

import {
  defineWidget,
  useDetailModal,
  useEntity,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const sinksarTodayConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
  show_entries: z.boolean().default(true),
});

type Attrs = Record<string, unknown>;

type SinksarEntry = {
  title: string;
  type?: string;
  order?: number;
  story?: string;
  arke: string[];
};

function str(attrs: Attrs, key: string): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function num(attrs: Attrs, key: string): number | undefined {
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
  attrs: Attrs,
  topStory?: string,
  topArke: string[] = [],
): SinksarEntry[] {
  const value = attrs.entries;
  if (!Array.isArray(value)) return [];
  const entries: SinksarEntry[] = [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!title) continue;
    const type =
      typeof record.type === "string" && record.type.trim()
        ? record.type.trim()
        : undefined;
    const order =
      typeof record.order === "number" && Number.isFinite(record.order)
        ? record.order
        : undefined;
    const entryStory =
      typeof record.story === "string" && record.story.trim()
        ? record.story.trim()
        : undefined;
    const entryArke = parseArke(record.arke);
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

function resolveStory(
  entry: SinksarEntry | undefined,
  index: number,
  topStory?: string,
): string | undefined {
  if (entry?.story) return entry.story;
  if (index === 0) return topStory;
  return undefined;
}

function resolveArke(
  entry: SinksarEntry | undefined,
  index: number,
  topArke: string[],
): string[] {
  if (entry && entry.arke.length > 0) return entry.arke;
  if (index === 0) return topArke;
  return [];
}

function SinksarDetailBody({
  entries,
  initialIndex,
  topStory,
  topArke,
}: {
  entries: SinksarEntry[];
  initialIndex: number;
  topStory?: string;
  topArke: string[];
}) {
  const [selected, setSelected] = useState(() =>
    Math.max(0, Math.min(initialIndex, Math.max(entries.length - 1, 0))),
  );
  const entry = entries[selected];
  const story = resolveStory(entry, selected, topStory);
  const arke = resolveArke(entry, selected, topArke);

  if (!entry) {
    return (
      <p className="text-sm text-muted-foreground">No Sinksar entries for today.</p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {entries.map((item, index) => {
            const active = index === selected;
            return (
              <li key={`${item.order ?? "x"}:${item.type ?? ""}:${item.title}`}>
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  className={`rounded-lg px-2.5 py-1.5 text-left text-xs leading-snug transition-colors ${
                    active
                      ? "bg-primary/15 text-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.title}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div>
        <h3 className="font-display text-base font-semibold leading-snug tracking-tight">
          {entry.title}
        </h3>
        {entry.type ? (
          <p className="mt-1 text-xs text-muted-foreground">{entry.type}</p>
        ) : null}
      </div>

      {story ? (
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Story
          </p>
          <p className="whitespace-pre-wrap text-sm leading-[1.75] text-foreground/90">
            {story}
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">No story for this entry.</p>
      )}

      {arke.length > 0 ? (
        <section className="space-y-2 border-t border-border/70 pt-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            አርኬ
          </p>
          <ul className="space-y-3">
            {arke.map((line) => (
              <li
                key={line}
                className="whitespace-pre-wrap text-sm leading-[1.8] text-foreground/90"
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SinksarToday({ config, interactive }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle = typeof config.title === "string" ? config.title.trim() : "";
  const entity = useEntity(entityId);
  const showEntries = config.show_entries !== false;
  const detailModal = useDetailModal();

  if (!entityId) {
    return (
      <div className="flex h-full min-h-40 flex-col justify-center rounded-2xl border border-border bg-card p-5">
        <p className="font-display text-base font-semibold">
          {customTitle || "Sinksar Today"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Bind a Sinksar sensor in settings.
        </p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-full min-h-40 flex-col justify-center rounded-2xl border border-dashed border-border bg-card p-5">
        <p className="font-display text-base font-semibold">
          {customTitle || entityId}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const attrs = entity.attributes;
  const primaryTitle =
    entity.state && entity.state !== "unknown" && entity.state !== "unavailable"
      ? entity.state
      : undefined;
  const dayOfYear = num(attrs, "day_of_year");
  const topStory = str(attrs, "story");
  const topArke = parseArke(attrs.arke);
  const entries = parseEntries(attrs, topStory, topArke);
  const listEntries =
    showEntries && primaryTitle
      ? entries.filter((entry) => entry.title !== primaryTitle)
      : showEntries
        ? entries
        : [];

  const openDetail = (initialIndex: number) => {
    if (!interactive) return;
    const safeIndex =
      entries.length === 0
        ? 0
        : Math.max(0, Math.min(initialIndex, entries.length - 1));
    const selected = entries[safeIndex];
    detailModal.open({
      title: "ስንክሳር",
      description:
        dayOfYear != null
          ? `ቀን ${dayOfYear}${selected ? ` · ${selected.title}` : ""}`
          : selected?.title,
      className: "max-w-2xl",
      body: (
        <SinksarDetailBody
          entries={entries}
          initialIndex={safeIndex}
          topStory={topStory}
          topArke={topArke}
        />
      ),
    });
  };

  const foundPrimary = primaryTitle
    ? entries.findIndex((entry) => entry.title === primaryTitle)
    : 0;
  const primaryIndex = foundPrimary >= 0 ? foundPrimary : 0;

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => openDetail(primaryIndex) : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail(primaryIndex);
              }
            }
          : undefined
      }
      className={`flex h-full min-h-40 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 text-left text-card-foreground shadow-sm outline-none transition-colors ${
        interactive
          ? "cursor-pointer hover:border-primary/40 hover:bg-card/90 focus-visible:ring-2 focus-visible:ring-ring"
          : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground">
          {customTitle || "ስንክሳር"}
        </p>
        {dayOfYear != null ? (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
            ቀን {dayOfYear}
          </span>
        ) : null}
      </div>

      <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
        {primaryTitle ?? "—"}
      </h3>

      {listEntries.length > 0 ? (
        <ul className="mt-3 space-y-1.5 overflow-y-auto">
          {listEntries.map((entry) => {
            const index = entries.findIndex((item) => item.title === entry.title);
            return (
              <li key={`${entry.order ?? ""}-${entry.title}`}>
                {interactive ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDetail(index >= 0 ? index : 0);
                    }}
                    className="block w-full rounded-md px-1 py-0.5 text-left text-sm leading-relaxed text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  >
                    <span className="text-foreground/90">{entry.title}</span>
                    {entry.type ? (
                      <span className="ml-1.5 text-xs text-muted-foreground/80">
                        · {entry.type}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    <span className="text-foreground/90">{entry.title}</span>
                    {entry.type ? (
                      <span className="ml-1.5 text-xs text-muted-foreground/80">
                        · {entry.type}
                      </span>
                    ) : null}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {interactive ? (
        <p className="mt-auto pt-3 text-xs text-muted-foreground">
          Tap to read story
        </p>
      ) : null}
    </div>
  );
}

export const sinksarTodayWidget = defineWidget({
  id: "@ethio/sinksar/today",
  name: "Sinksar Today",
  description: "Today's Ethiopian Orthodox Sinksar (Synaxarium) reading",
  component: SinksarToday,
  configSchema: sinksarTodayConfigSchema,
  defaultConfig: {
    title: "",
    entity_id: "",
    show_entries: true,
  },
  defaultSize: { w: 4, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 10 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 8, h: 10 },
  entityDomains: ["sensor"],
  capabilities: ["entity.read"],
});
