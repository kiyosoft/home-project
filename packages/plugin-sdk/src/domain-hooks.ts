import { useCallback, useEffect, useMemo, useState } from "react";

import {
  calendarRangeEnd,
  calendarRangeStart,
  cameraMjpegPath,
  cameraStillPath,
  deriveAlarm,
  deriveCalendar,
  deriveCamera,
  deriveLight,
  deriveLock,
  getCalendarEvents,
  subscribeCalendarEvents,
  type AlarmView,
  type CalendarEvent,
  type CalendarView,
  type CameraView,
  type LightView,
  type LockView,
} from "@ethio/ha-sdk";

import { getPlatformBindings } from "./bindings";
import {
  resolveEntityImageUrl,
  useBaseUrl,
  useCallService,
  useEntity,
  useSendMessage,
  useSubscribeMessage,
} from "./hooks";

function useAuthToken(): string {
  return getPlatformBindings().getAuthToken?.() ?? "";
}

function resolveAuthedUrl(
  path: string | null | undefined,
  baseUrl: string,
  token: string,
  accessToken?: string,
): string | null {
  const resolved = resolveEntityImageUrl(path, baseUrl);
  if (!resolved) return null;
  const auth = accessToken || token;
  if (!auth) return resolved;
  if (
    resolved.startsWith("http://") ||
    resolved.startsWith("https://") ||
    resolved.startsWith("data:")
  ) {
    // Absolute demo/CDN URLs don't need HA token.
    if (!resolved.includes(baseUrl) && baseUrl) return resolved;
  }
  const separator = resolved.includes("?") ? "&" : "?";
  if (resolved.includes("token=") || resolved.includes("authSig=")) {
    return resolved;
  }
  return `${resolved}${separator}token=${encodeURIComponent(auth)}`;
}

export type UseLightResult = LightView & {
  toggle: () => Promise<void>;
  turnOn: () => Promise<void>;
  turnOff: () => Promise<void>;
  setBrightness: (value: number) => Promise<void>;
  setBrightnessPercent: (value: number) => Promise<void>;
  setRgbColor: (rgb: [number, number, number]) => Promise<void>;
  setColorTemp: (kelvin: number) => Promise<void>;
  setEffect: (effect: string) => Promise<void>;
};

export function useLight(entityId: string): UseLightResult | null {
  const entity = useEntity(entityId);
  const callService = useCallService();
  const view = useMemo(() => deriveLight(entity), [entity]);

  const toggle = useCallback(async () => {
    await callService("light", "toggle", { entity_id: entityId });
  }, [callService, entityId]);

  const turnOn = useCallback(async () => {
    await callService("light", "turn_on", { entity_id: entityId });
  }, [callService, entityId]);

  const turnOff = useCallback(async () => {
    await callService("light", "turn_off", { entity_id: entityId });
  }, [callService, entityId]);

  const setBrightness = useCallback(
    async (value: number) => {
      await callService("light", "turn_on", {
        entity_id: entityId,
        brightness: Math.min(255, Math.max(0, Math.round(value))),
      });
    },
    [callService, entityId],
  );

  const setBrightnessPercent = useCallback(
    async (value: number) => {
      await callService("light", "turn_on", {
        entity_id: entityId,
        brightness_pct: Math.min(100, Math.max(0, Math.round(value))),
      });
    },
    [callService, entityId],
  );

  const setRgbColor = useCallback(
    async (rgb: [number, number, number]) => {
      await callService("light", "turn_on", {
        entity_id: entityId,
        rgb_color: rgb,
      });
    },
    [callService, entityId],
  );

  const setColorTemp = useCallback(
    async (kelvin: number) => {
      await callService("light", "turn_on", {
        entity_id: entityId,
        color_temp_kelvin: Math.round(kelvin),
      });
    },
    [callService, entityId],
  );

  const setEffect = useCallback(
    async (effect: string) => {
      await callService("light", "turn_on", {
        entity_id: entityId,
        effect,
      });
    },
    [callService, entityId],
  );

  if (!view) return null;
  return {
    ...view,
    toggle,
    turnOn,
    turnOff,
    setBrightness,
    setBrightnessPercent,
    setRgbColor,
    setColorTemp,
    setEffect,
  };
}

export type UseCameraResult = CameraView & {
  stillUrl: string | null;
  streamUrl: string | null;
  refreshKey: number;
  refreshImage: () => void;
  turnOn: () => Promise<void>;
  turnOff: () => Promise<void>;
};

export function useCamera(entityId: string): UseCameraResult | null {
  const entity = useEntity(entityId);
  const callService = useCallService();
  const baseUrl = useBaseUrl();
  const token = useAuthToken();
  const [refreshKey, setRefreshKey] = useState(0);
  const view = useMemo(() => deriveCamera(entity), [entity]);

  const stillUrl = useMemo(() => {
    if (!view) return null;
    const path = cameraStillPath(view.entityId, view.entityPicture);
    const url = resolveAuthedUrl(path, baseUrl, token, view.accessToken);
    if (!url) return null;
    if (url.startsWith("https://picsum.photos") || url.startsWith("data:")) {
      return url;
    }
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${refreshKey}`;
  }, [view, baseUrl, token, refreshKey]);

  const streamUrl = useMemo(() => {
    if (!view?.supportsStream) return null;
    const path = cameraMjpegPath(view.entityId);
    return resolveAuthedUrl(path, baseUrl, token, view.accessToken);
  }, [view, baseUrl, token]);

  const refreshImage = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const turnOn = useCallback(async () => {
    await callService("camera", "turn_on", { entity_id: entityId });
  }, [callService, entityId]);

  const turnOff = useCallback(async () => {
    await callService("camera", "turn_off", { entity_id: entityId });
  }, [callService, entityId]);

  if (!view) return null;
  return {
    ...view,
    stillUrl,
    streamUrl,
    refreshKey,
    refreshImage,
    turnOn,
    turnOff,
  };
}

export type UseLockResult = LockView & {
  lock: () => Promise<void>;
  unlock: (code?: string) => Promise<void>;
  open: (code?: string) => Promise<void>;
};

export function useLock(entityId: string): UseLockResult | null {
  const entity = useEntity(entityId);
  const callService = useCallService();
  const view = useMemo(() => deriveLock(entity), [entity]);

  const lock = useCallback(async () => {
    await callService("lock", "lock", { entity_id: entityId });
  }, [callService, entityId]);

  const unlock = useCallback(
    async (code?: string) => {
      await callService("lock", "unlock", {
        entity_id: entityId,
        ...(code ? { code } : {}),
      });
    },
    [callService, entityId],
  );

  const open = useCallback(
    async (code?: string) => {
      await callService("lock", "open", {
        entity_id: entityId,
        ...(code ? { code } : {}),
      });
    },
    [callService, entityId],
  );

  if (!view) return null;
  return { ...view, lock, unlock, open };
}

export type UseAlarmResult = AlarmView & {
  disarm: (code?: string) => Promise<void>;
  armHome: (code?: string) => Promise<void>;
  armAway: (code?: string) => Promise<void>;
  armNight: (code?: string) => Promise<void>;
  armVacation: (code?: string) => Promise<void>;
  armCustomBypass: (code?: string) => Promise<void>;
  trigger: () => Promise<void>;
};

function withCode(entityId: string, code?: string) {
  return {
    entity_id: entityId,
    ...(code ? { code } : {}),
  };
}

export function useAlarm(entityId: string): UseAlarmResult | null {
  const entity = useEntity(entityId);
  const callService = useCallService();
  const view = useMemo(() => deriveAlarm(entity), [entity]);

  const disarm = useCallback(
    async (code?: string) => {
      await callService(
        "alarm_control_panel",
        "alarm_disarm",
        withCode(entityId, code),
      );
    },
    [callService, entityId],
  );

  const armHome = useCallback(
    async (code?: string) => {
      await callService(
        "alarm_control_panel",
        "alarm_arm_home",
        withCode(entityId, code),
      );
    },
    [callService, entityId],
  );

  const armAway = useCallback(
    async (code?: string) => {
      await callService(
        "alarm_control_panel",
        "alarm_arm_away",
        withCode(entityId, code),
      );
    },
    [callService, entityId],
  );

  const armNight = useCallback(
    async (code?: string) => {
      await callService(
        "alarm_control_panel",
        "alarm_arm_night",
        withCode(entityId, code),
      );
    },
    [callService, entityId],
  );

  const armVacation = useCallback(
    async (code?: string) => {
      await callService(
        "alarm_control_panel",
        "alarm_arm_vacation",
        withCode(entityId, code),
      );
    },
    [callService, entityId],
  );

  const armCustomBypass = useCallback(
    async (code?: string) => {
      await callService(
        "alarm_control_panel",
        "alarm_arm_custom_bypass",
        withCode(entityId, code),
      );
    },
    [callService, entityId],
  );

  const trigger = useCallback(async () => {
    await callService("alarm_control_panel", "alarm_trigger", {
      entity_id: entityId,
    });
  }, [callService, entityId]);

  if (!view) return null;
  return {
    ...view,
    disarm,
    armHome,
    armAway,
    armNight,
    armVacation,
    armCustomBypass,
    trigger,
  };
}

export type UseCalendarResult = CalendarView & {
  events: CalendarEvent[];
  eventsLoading: boolean;
  eventsError: string | null;
  refreshEvents: () => void;
  getEvents: (start: string, end: string) => Promise<CalendarEvent[]>;
  createEvent: (event: Omit<CalendarEvent, "uid">) => Promise<void>;
};

export function useCalendar(entityId: string): UseCalendarResult | null {
  const entity = useEntity(entityId);
  const callService = useCallService();
  const sendMessage = useSendMessage();
  const subscribeMessage = useSubscribeMessage();
  const view = useMemo(() => deriveCalendar(entity), [entity]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(Boolean(entityId));
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const getEvents = useCallback(
    async (start: string, end: string) => {
      return getCalendarEvents(sendMessage, entityId, start, end);
    },
    [sendMessage, entityId],
  );

  const createEvent = useCallback(
    async (event: Omit<CalendarEvent, "uid">) => {
      await callService("calendar", "create_event", {
        entity_id: entityId,
        summary: event.summary,
        start_date_time: event.start,
        end_date_time: event.end,
        ...(event.description ? { description: event.description } : {}),
        ...(event.location ? { location: event.location } : {}),
      });
    },
    [callService, entityId],
  );

  const refreshEvents = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!entityId) {
      setEvents([]);
      setEventsLoading(false);
      setEventsError(null);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setEventsLoading(true);
    setEventsError(null);
    const start = calendarRangeStart();
    const end = calendarRangeEnd();

    void (async () => {
      try {
        unsubscribe = await subscribeCalendarEvents(
          subscribeMessage,
          entityId,
          start,
          end,
          (next) => {
            if (cancelled) return;
            setEvents(next);
            setEventsLoading(false);
            setEventsError(null);
          },
        );
        if (cancelled) {
          unsubscribe();
        }
      } catch {
        if (cancelled) return;
        // Older HA builds may lack calendar/event/subscribe; fall back to get_events.
        try {
          const next = await getCalendarEvents(
            sendMessage,
            entityId,
            start,
            end,
          );
          if (cancelled) return;
          setEvents(next);
          setEventsLoading(false);
          setEventsError(null);
        } catch (err: unknown) {
          if (cancelled) return;
          setEvents([]);
          setEventsLoading(false);
          setEventsError(
            err instanceof Error ? err.message : "Failed to load events",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [entityId, sendMessage, subscribeMessage, refreshToken]);

  if (!view) return null;
  return {
    ...view,
    events,
    eventsLoading,
    eventsError,
    refreshEvents,
    getEvents,
    createEvent,
  };
}
