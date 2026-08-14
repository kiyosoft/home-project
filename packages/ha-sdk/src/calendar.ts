import type { HassEntity } from "./types";

export interface CalendarEvent {
  start: string;
  end: string;
  summary: string;
  uid?: string;
  description?: string;
  location?: string;
  rrule?: string;
}

function strAttr(
  attrs: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export interface CalendarView {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  hasActiveEvent: boolean;
  message: string | undefined;
  startTime: string | undefined;
  endTime: string | undefined;
  location: string | undefined;
  description: string | undefined;
  isAllDay: boolean;
}

export function deriveCalendar(
  entity: HassEntity | undefined,
): CalendarView | null {
  if (!entity) return null;
  const attrs = entity.attributes;
  const state = entity.state.toLowerCase();
  const hasActiveEvent = state === "on";
  return {
    entityId: entity.entity_id,
    state: entity.state,
    attributes: attrs,
    hasActiveEvent,
    message: strAttr(attrs, "message"),
    startTime: strAttr(attrs, "start_time"),
    endTime: strAttr(attrs, "end_time"),
    location: strAttr(attrs, "location"),
    description: strAttr(attrs, "description"),
    isAllDay: attrs.all_day === true,
  };
}

function normalizeEvent(value: unknown): CalendarEvent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const summary = typeof raw.summary === "string" ? raw.summary : "";
  const start =
    typeof raw.start === "string"
      ? raw.start
      : raw.start && typeof raw.start === "object"
        ? String(
            (raw.start as Record<string, unknown>).dateTime ??
              (raw.start as Record<string, unknown>).date ??
              "",
          )
        : "";
  const end =
    typeof raw.end === "string"
      ? raw.end
      : raw.end && typeof raw.end === "object"
        ? String(
            (raw.end as Record<string, unknown>).dateTime ??
              (raw.end as Record<string, unknown>).date ??
              "",
          )
        : "";
  if (!summary || !start || !end) return null;
  const event: CalendarEvent = { start, end, summary };
  if (typeof raw.uid === "string" && raw.uid) event.uid = raw.uid;
  if (typeof raw.description === "string" && raw.description) {
    event.description = raw.description;
  }
  if (typeof raw.location === "string" && raw.location) {
    event.location = raw.location;
  }
  if (typeof raw.rrule === "string" && raw.rrule) event.rrule = raw.rrule;
  return event;
}

/** Unwrap HA `return_response` / list envelopes into CalendarEvent[]. */
export function normalizeCalendarEvents(result: unknown): CalendarEvent[] {
  if (Array.isArray(result)) {
    return result
      .map(normalizeEvent)
      .filter((event): event is CalendarEvent => event != null);
  }
  if (result && typeof result === "object") {
    const raw = result as Record<string, unknown>;
    // call_service return_response: { context, response: { [entity_id]: { events } } }
    if ("response" in raw && raw.response != null) {
      return normalizeCalendarEvents(raw.response);
    }
    if (Array.isArray(raw.events)) {
      return normalizeCalendarEvents(raw.events);
    }
    // Entity map: { "calendar.family": { events: [...] } }
    const collected: CalendarEvent[] = [];
    for (const value of Object.values(raw)) {
      if (value && typeof value === "object") {
        const nested = value as Record<string, unknown>;
        if (Array.isArray(nested.events)) {
          collected.push(...normalizeCalendarEvents(nested.events));
        }
      }
    }
    if (collected.length > 0) return collected;
  }
  return [];
}

/** Start of local day as ISO, for inclusive “today + upcoming” windows. */
export function calendarRangeStart(now = new Date()): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export function calendarRangeEnd(now = new Date(), days = 14): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getCalendarEvents(
  sendMessage: <T = unknown>(message: Record<string, unknown>) => Promise<T>,
  entityId: string,
  start: string,
  end: string,
): Promise<CalendarEvent[]> {
  const result = await sendMessage({
    type: "call_service",
    domain: "calendar",
    service: "get_events",
    target: { entity_id: entityId },
    service_data: {
      entity_id: entityId,
      start_date_time: start,
      end_date_time: end,
    },
    return_response: true,
  });
  return normalizeCalendarEvents(result);
}

interface CalendarSubscribeResult {
  events?: unknown;
}

/**
 * Live subscription used by the HA frontend (`calendar/event/subscribe`).
 * Pushes an initial event list, then updates when the calendar changes.
 */
export function subscribeCalendarEvents(
  subscribeMessage: <T>(
    message: Record<string, unknown>,
    onMessage: (result: T) => void,
  ) => Promise<() => void>,
  entityId: string,
  start: string,
  end: string,
  onEvents: (events: CalendarEvent[]) => void,
): Promise<() => void> {
  return subscribeMessage<CalendarSubscribeResult>(
    {
      type: "calendar/event/subscribe",
      entity_id: entityId,
      start,
      end,
    },
    (result) => {
      onEvents(normalizeCalendarEvents(result));
    },
  );
}
