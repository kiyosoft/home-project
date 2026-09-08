import { fireEventOnHub } from "@/lib/webhook";
import { useHaStore } from "@/store/ha-store";

import {
  WATCH_GESTURE_EVENT,
  buildWatchGestureEventData,
  isWatchGesture,
  type WatchGesture,
} from "./gestures";
import type { WatchCommandResult } from "./native";

export async function fireWatchGesture(options: {
  gesture: string;
  atHome: boolean;
  areaId: string;
}): Promise<WatchCommandResult> {
  if (!isWatchGesture(options.gesture)) return { ok: false };

  const { mode, sendMessagePromise, registration } = useHaStore.getState();
  const eventData = buildWatchGestureEventData({
    gesture: options.gesture,
    atHome: options.atHome,
    areaId: options.areaId,
    deviceId: registration?.deviceId ?? "",
  });

  if (mode === "demo") return { ok: true, gesture: options.gesture };

  try {
    await sendMessagePromise({
      type: "fire_event",
      event_type: WATCH_GESTURE_EVENT,
      event_data: eventData,
    });
    return { ok: true, gesture: options.gesture };
  } catch {
    const delivery = await fireEventOnHub(
      WATCH_GESTURE_EVENT,
      { ...eventData },
    );
    return { ok: delivery === "sent", gesture: options.gesture };
  }
}

export function parseWatchGesture(
  payload: { gesture?: unknown } | null | undefined,
): WatchGesture | null {
  return isWatchGesture(payload?.gesture) ? payload.gesture : null;
}

export { WATCH_GESTURE_EVENT, type WatchGesture };
