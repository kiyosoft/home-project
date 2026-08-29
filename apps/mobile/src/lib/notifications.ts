import {
  parsePushNotification,
  type MobileAppPushNotification,
  type NotificationImportance,
  type NotificationInterruption,
  type NotificationPresentation,
} from "@ethio/ha-sdk";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Turning Home Assistant notification payloads into notifications the OS draws.
 *
 * Payloads that arrive over the WebSocket are presented as local notifications;
 * ones that arrive through APNs or FCM are drawn by the OS before our code runs.
 */

/** The channel the closed-app relay pins to. Keep HIGH so those still heads-up. */
const ANDROID_DEFAULT_CHANNEL = "default";

/** Marks a notification we scheduled ourselves, so we do not re-file it. */
const LOCAL_MARKER = "ethioHomeLocal";

const ANDROID_IMPORTANCE = {
  min: Notifications.AndroidImportance.MIN,
  low: Notifications.AndroidImportance.LOW,
  default: Notifications.AndroidImportance.DEFAULT,
  high: Notifications.AndroidImportance.HIGH,
  max: Notifications.AndroidImportance.MAX,
} as const satisfies Record<
  NotificationImportance,
  Notifications.AndroidImportance
>;

const ANDROID_PRIORITY = {
  min: Notifications.AndroidNotificationPriority.MIN,
  low: Notifications.AndroidNotificationPriority.LOW,
  default: Notifications.AndroidNotificationPriority.DEFAULT,
  high: Notifications.AndroidNotificationPriority.HIGH,
  max: Notifications.AndroidNotificationPriority.MAX,
} as const satisfies Record<
  NotificationImportance,
  Notifications.AndroidNotificationPriority
>;

const IOS_INTERRUPTION = {
  passive: "passive",
  active: "active",
  "time-sensitive": "timeSensitive",
  critical: "critical",
} as const satisfies Record<
  NotificationInterruption,
  NonNullable<Notifications.NotificationContentInput["interruptionLevel"]>
>;

const IMPORTANCE_CHANNELS: Record<
  Exclude<NotificationImportance, "high">,
  { id: string; name: string }
> = {
  min: { id: "ha-min", name: "Minimal" },
  low: { id: "ha-low", name: "Low" },
  default: { id: "ha-default", name: "Default" },
  max: { id: "ha-max", name: "Urgent" },
};

let handlerConfigured = false;

export function configureNotifications(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data;
      if (isLocallyPresented(data)) {
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      }

      const parsed = parsePushNotification({
        message: notification.request.content.body,
        title: notification.request.content.title,
        data,
      });
      return presentationBehavior(
        parsed?.presentation ?? { alert: true, sound: true, badge: false },
      );
    },
  });

  if (Platform.OS === "android") {
    void ensureAndroidChannels().catch(() => {
      // A missing channel downgrades the banner; it does not break delivery.
    });
  }
}

function presentationBehavior(presentation: NotificationPresentation) {
  return {
    shouldShowBanner: presentation.alert,
    shouldShowList: presentation.alert,
    shouldPlaySound: presentation.sound,
    shouldSetBadge: presentation.badge,
  };
}

async function ensureAndroidChannels(): Promise<void> {
  await Promise.all([
    Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL, {
      name: "Home Assistant",
      importance: Notifications.AndroidImportance.HIGH,
    }),
    ...(["min", "low", "default", "max"] as const).map((importance) => {
      const channel = IMPORTANCE_CHANNELS[importance];
      return Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: ANDROID_IMPORTANCE[importance],
      });
    }),
  ]);
}

export type PermissionState = "granted" | "denied" | "undetermined";

export async function notificationPermission(): Promise<PermissionState> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "undetermined" || canAskAgain) return "undetermined";
  return "denied";
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      // Granted only if Apple issued the entitlement; otherwise iOS ignores it.
      allowCriticalAlerts: true,
    },
  });
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

async function androidChannelId(
  notification: MobileAppPushNotification,
): Promise<string | undefined> {
  if (Platform.OS !== "android") return undefined;

  if (notification.channel) {
    const id = sanitizeChannelId(notification.channel);
    try {
      await Notifications.setNotificationChannelAsync(id, {
        name: notification.channel,
        importance: ANDROID_IMPORTANCE[notification.importance],
      });
    } catch {
      return ANDROID_DEFAULT_CHANNEL;
    }
    return id;
  }

  if (notification.importance === "high") return ANDROID_DEFAULT_CHANNEL;
  return IMPORTANCE_CHANNELS[notification.importance].id;
}

function sanitizeChannelId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || ANDROID_DEFAULT_CHANNEL;
}

export async function presentNotification(
  notification: MobileAppPushNotification,
): Promise<void> {
  const [categoryIdentifier, channelId] = await Promise.all([
    ensureCategory(notification),
    androidChannelId(notification),
  ]);

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
        sound: notification.interruption !== "passive",
        interruptionLevel: IOS_INTERRUPTION[notification.interruption],
        priority: ANDROID_PRIORITY[notification.importance],
        ...(categoryIdentifier ? { categoryIdentifier } : {}),
        ...(channelId ? { channelId } : {}),
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
    await Promise.all(
      presented.map((item) => {
        const data = item.request.content.data as Record<string, unknown> | null;
        if (data?.haTag !== tag && data?.tag !== tag) return Promise.resolve();
        return Notifications.dismissNotificationAsync(item.request.identifier);
      }),
    );
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
