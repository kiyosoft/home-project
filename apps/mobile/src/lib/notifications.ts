import {
  parsePushNotification,
  type MobileAppPushNotification,
} from "@ethio/ha-sdk";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Turning Home Assistant notification payloads into notifications the OS draws.
 *
 * Payloads that arrive over the WebSocket are presented as local notifications;
 * ones that arrive through APNs or FCM are drawn by the OS before our code runs.
 */

const ANDROID_CHANNEL_ID = "default";

/** Marks a notification we scheduled ourselves, so we do not re-file it. */
const LOCAL_MARKER = "ethioHomeLocal";

let handlerConfigured = false;

export function configureNotifications(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Home Assistant",
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {
      // A missing channel downgrades the banner; it does not break delivery.
    });
  }
}

export type PermissionState = "granted" | "denied" | "undetermined";

export async function notificationPermission(): Promise<PermissionState> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "undetermined" || canAskAgain) return "undetermined";
  return "denied";
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted" ? "granted" : "denied";
}

/**
 * Actions have to be registered as a category before the notification that uses
 * them. The id is derived from the actions so repeat payloads reuse one category.
 */
async function ensureCategory(
  notification: MobileAppPushNotification,
): Promise<string | undefined> {
  if (notification.actions.length === 0) return undefined;

  const categoryId = `ha-${notification.actions
    .map((action) => action.action)
    .join("|")
    .slice(0, 80)}`;

  try {
    await Notifications.setNotificationCategoryAsync(
      categoryId,
      notification.actions.map((action) => ({
        identifier: action.action,
        buttonTitle: action.title,
        options: { opensAppToForeground: true },
      })),
    );
    return categoryId;
  } catch {
    // Without a category the notification still shows, just without buttons.
    return undefined;
  }
}

export async function presentNotification(
  notification: MobileAppPushNotification,
): Promise<void> {
  const categoryIdentifier = await ensureCategory(notification);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title ?? undefined,
        body: notification.message,
        data: {
          ...notification.data,
          [LOCAL_MARKER]: true,
          haTag: notification.tag,
        },
        ...(categoryIdentifier ? { categoryIdentifier } : {}),
      },
      // Immediately, rather than on a schedule.
      trigger: null,
    });
  } catch {
    // The Activity tab still has it; a missing banner is not worth surfacing.
  }
}

/**
 * HA's `clear_notification` command removes an already-delivered notification.
 *
 * Matches either tag field. `haTag` is on the ones we presented from the
 * socket; anything the relay delivered was drawn by the OS from Home
 * Assistant's own payload and carries only `tag`, so checking one field would
 * clear the Activity entry and leave the banner on screen.
 */
export async function dismissByTag(tag: string): Promise<void> {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const item of presented) {
      const data = item.request.content.data as Record<string, unknown> | null;
      if (data?.haTag === tag || data?.tag === tag) {
        await Notifications.dismissNotificationAsync(item.request.identifier);
      }
    }
  } catch {
    // Nothing to do if the OS will not tell us what is on screen.
  }
}

export function isLocallyPresented(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>)[LOCAL_MARKER] === true
  );
}

export interface PresentedNotification {
  notification: MobileAppPushNotification;
  /** The OS's own id, stable for as long as it sits in the tray. */
  identifier: string;
  receivedAt: number;
}

/**
 * Rebuilds the Home Assistant payload from a notification the OS drew for us.
 * The relay forwards HA's `data` untouched, so tag and actions are still in
 * there and the socket path's parser can read it back out. Returns null for
 * notifications we scheduled ourselves, which are already filed.
 */
export function fromOsNotification(
  notification: Notifications.Notification,
): PresentedNotification | null {
  const content = notification.request.content;
  const data = (content.data ?? {}) as Record<string, unknown>;
  if (isLocallyPresented(data)) return null;

  const parsed = parsePushNotification({
    message: content.body,
    title: content.title,
    data,
  });
  if (!parsed) return null;

  return {
    notification: parsed,
    identifier: notification.request.identifier,
    receivedAt: normalizeReceivedAt(notification.date),
  };
}

/**
 * What is in the notification tray right now. On a cold start this is the only
 * trace of pushes that APNs or FCM drew while the app was dead: no listener of
 * ours was alive to see them, so without this Activity would never show them.
 */
export async function presentedNotifications(): Promise<
  PresentedNotification[]
> {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    const entries: PresentedNotification[] = [];
    for (const item of presented) {
      const entry = fromOsNotification(item);
      if (entry) entries.push(entry);
    }
    return entries;
  } catch {
    // Android below 6.0 will not list the tray, and live delivery still works.
    return [];
  }
}

function normalizeReceivedAt(date: number): number {
  if (!Number.isFinite(date) || date <= 0) return Date.now();
  // Anything this small is seconds rather than the documented milliseconds.
  return date < 1e11 ? date * 1000 : date;
}

export const DEFAULT_ACTION = Notifications.DEFAULT_ACTION_IDENTIFIER;
