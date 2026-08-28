import {
  CLEAR_NOTIFICATION,
  confirmPush,
  subscribePushChannel,
  type MobileAppPushNotification,
} from "@ethio/ha-sdk";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, Linking } from "react-native";

import {
  configureNotifications,
  DEFAULT_ACTION,
  dismissByTag,
  fromOsNotification,
  presentedNotifications,
  presentNotification,
} from "@/lib/notifications";
import { fireNotificationAction } from "@/lib/webhook";
import { hasSession, useHaStore } from "@/store/ha-store";
import { useNotificationStore } from "@/store/notification-store";

configureNotifications();

/**
 * Home Assistant's local push channel: notifications arrive as events on the
 * socket we already hold. Confirming each one is what stops HA from also
 * sending it through the cloud fallback.
 */
export function useNotifySession() {
  const status = useHaStore((state) => state.status);
  const webhookId = useHaStore((state) => state.registration?.webhookId ?? "");
  const subscribeMessage = useHaStore((state) => state.subscribeMessage);
  const sendMessagePromise = useHaStore((state) => state.sendMessagePromise);
  const record = useNotificationStore((state) => state.record);

  // Keep the subscription across a reconnect: the socket layer replays it, and
  // tearing down mid-flight would race with that replay.
  const session = hasSession(status);

  useEffect(() => {
    if (!session || !webhookId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const handle = (notification: MobileAppPushNotification) => {
      if (notification.confirmId) {
        void confirmPush(
          sendMessagePromise,
          webhookId,
          notification.confirmId,
        ).catch(() => {
          // Worst case HA retries over the cloud path and the user sees it twice.
        });
      }

      record(notification);

      if (notification.message === CLEAR_NOTIFICATION) {
        if (notification.tag) void dismissByTag(notification.tag);
        return;
      }
      void presentNotification(notification);
    };

    void subscribePushChannel(subscribeMessage, webhookId, handle)
      .then((dispose) => {
        if (cancelled) {
          dispose();
          return;
        }
        unsubscribe = dispose;
      })
      .catch(() => {
        // An instance too old for the push channel still works for everything else.
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [session, webhookId, subscribeMessage, sendMessagePromise, record]);

  useNotificationResponses();
  useRemoteNotifications();
  useTrayBackfill();
}

/**
 * Taps and action buttons, which have to travel back to HA as an event.
 *
 * `useLastNotificationResponse` rather than a plain listener: a tap that
 * launches the app from a killed state happens before any listener could have
 * been registered, and only this hook replays it.
 */
function useNotificationResponses() {
  const response = Notifications.useLastNotificationResponse();
  const record = useNotificationStore((state) => state.record);
  const handled = useRef<Notifications.NotificationResponse | null>(null);

  useEffect(() => {
    if (!response || handled.current === response) return;
    handled.current = response;

    const data = (response.notification.request.content.data ??
      {}) as Record<string, unknown>;

    // Filed here as well as by the tray scan, because a tap is the one path
    // where the scan cannot see it: opening a notification removes it from the
    // tray, so on a cold start from a tap there is nothing left to find. Ones
    // we presented ourselves are already filed and `fromOsNotification`
    // declines them.
    const entry = fromOsNotification(response.notification);
    if (entry) {
      record(entry.notification, {
        id: entry.identifier,
        receivedAt: entry.receivedAt,
      });
    }

    if (response.actionIdentifier !== DEFAULT_ACTION) {
      void fireNotificationAction({
        action: response.actionIdentifier,
        tag: readTag(data),
        replyText: response.userText,
        actionData: readActionData(data),
      });
    }

    openTarget(data);
  }, [response, record]);
}

/**
 * `haTag` is ours, stamped on the notifications we present from the socket.
 * `tag` is Home Assistant's own field, which survives untouched on anything the
 * relay delivered, and is all there is to go on for those.
 */
function readTag(data: Record<string, unknown>): string | null {
  if (typeof data.haTag === "string" && data.haTag) return data.haTag;
  if (typeof data.tag === "string" && data.tag) return data.tag;
  return null;
}

/**
 * Notifications delivered through APNs or FCM never pass through the socket, so
 * they are filed here instead. Ones we scheduled ourselves are already filed.
 */
function useRemoteNotifications() {
  const record = useNotificationStore((state) => state.record);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const entry = fromOsNotification(notification);
        if (!entry) return;
        record(entry.notification, {
          id: entry.identifier,
          receivedAt: entry.receivedAt,
        });
      },
    );

    return () => {
      subscription.remove();
    };
  }, [record]);
}

/**
 * A push that lands while the app is not running in the foreground is drawn by
 * the OS and seen by nobody else, so the tray is the only place left to read it
 * from. Waits for the stored history first, so nothing already filed is
 * reopened.
 *
 * Rescanned every time the app comes back rather than once per launch: the
 * received listener only fires while we are foregrounded, and handling a push
 * any earlier than this would mean a background task and a data-only payload.
 * Anything that arrived while we were away is still sitting in the tray, and
 * `backfill` ignores what it has already filed.
 */
function useTrayBackfill() {
  const hydrated = useNotificationStore((state) => state.hydrated);
  const backfill = useNotificationStore((state) => state.backfill);

  useEffect(() => {
    if (!hydrated) return;

    const scan = () => {
      void presentedNotifications().then(backfill);
    };

    scan();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") scan();
    });

    return () => {
      subscription.remove();
    };
  }, [hydrated, backfill]);
}

function readActionData(
  data: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const actionData = data.action_data;
  if (typeof actionData !== "object" || actionData === null) return undefined;
  return actionData as Record<string, unknown>;
}

/**
 * HA notifications can carry a `url`. A bare path in one means a page in the
 * Home Assistant frontend rather than a screen of ours, so only absolute URLs
 * are followed; everything else lands on Activity, where the message is waiting.
 */
function openTarget(data: Record<string, unknown>) {
  const url = typeof data.url === "string" ? data.url.trim() : "";

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    void Linking.openURL(url).catch(() => {
      // A bad URL in an automation should not crash the tap handler.
    });
    return;
  }

  try {
    router.navigate("/activity");
  } catch {
    // Cold start from a notification can beat the router; Activity holds it.
  }
}
