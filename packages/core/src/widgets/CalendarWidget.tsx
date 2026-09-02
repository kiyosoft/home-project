import { CalendarDays } from "lucide-react";
import { z } from "zod";

import {
  defineWidget,
  useCalendar,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const calendarConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
  maxItems: z.number().int().min(1).max(20).default(5),
});

function formatWhen(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function CalendarWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle =
    typeof config.title === "string" ? config.title.trim() : "";
  const maxItems =
    typeof config.maxItems === "number" && Number.isFinite(config.maxItems)
      ? Math.min(20, Math.max(1, Math.round(config.maxItems)))
      : 5;
  const calendar = useCalendar(entityId);

  if (!entityId) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">
          {customTitle || "Calendar"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a calendar entity in settings.
        </p>
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">
          {customTitle || entityId}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const displayTitle =
    customTitle ||
    (typeof calendar.attributes.friendly_name === "string"
      ? calendar.attributes.friendly_name
      : calendar.entityId);

  const now = Date.now();
  const events = calendar.events
    .filter((event) => {
      const endMs = Date.parse(event.end);
      return Number.isNaN(endMs) || endMs >= now;
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, maxItems);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Calendar
          </p>
          <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
            {displayTitle}
          </h3>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>

      {calendar.hasActiveEvent && calendar.message ? (
        <div className="mt-4 rounded-xl bg-primary/10 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Now
          </p>
          <p className="font-medium">{calendar.message}</p>
          <p className="text-xs text-muted-foreground">
            {formatWhen(calendar.startTime)}
            {calendar.endTime ? ` – ${formatWhen(calendar.endTime)}` : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-auto">
        {calendar.eventsLoading ? (
          <p className="text-sm text-muted-foreground">Loading events…</p>
        ) : calendar.eventsError ? (
          <p className="text-sm text-destructive">{calendar.eventsError}</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        ) : (
          events.map((event) => (
            <div
              key={`${event.uid ?? event.summary}-${event.start}`}
              className="rounded-xl border border-border/70 px-3 py-2"
            >
              <p className="text-sm font-medium">{event.summary}</p>
              <p className="text-xs text-muted-foreground">
                {formatWhen(event.start)}
              </p>
            </div>
          ))
        )}
      </div>

      {interactive ? (
        <button
          type="button"
          onClick={() => calendar.refreshEvents()}
          className="mt-3 self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Refresh
        </button>
      ) : null}
    </div>
  );
}

export const calendarWidget = defineWidget({
  id: "@ethio/core/calendar",
  name: "Calendar",
  description: "Show upcoming Home Assistant calendar events",
  component: CalendarWidget,
  configSchema: calendarConfigSchema,
  defaultConfig: { title: "", entity_id: "", maxItems: 5 },
  defaultSize: { w: 4, h: 5, minW: 3, minH: 3, maxW: 8, maxH: 8 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 8, h: 8 },
  entityDomains: ["calendar"],
  capabilities: ["entity.read", "service.call"],
});
