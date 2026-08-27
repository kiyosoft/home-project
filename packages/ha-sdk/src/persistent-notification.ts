/**
 * Home Assistant's own notification drawer. These stopped being entities in
 * 2022 and now live behind a dedicated subscription that streams deltas, so we
 * accumulate them here and hand callers the whole list.
 */

export interface PersistentNotification {
  notificationId: string;
  title: string | null;
  message: string;
  /** ISO timestamp from HA, or null on instances that omit it. */
  createdAt: string | null;
}

type UpdateType = "current" | "added" | "updated" | "removed";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNotification(
  id: string,
  value: unknown,
): PersistentNotification | null {
  if (!isRecord(value)) return null;
  const message = typeof value.message === "string" ? value.message : "";
  if (!message) return null;
  const notificationId =
    typeof value.notification_id === "string" ? value.notification_id : id;
  return {
    notificationId,
    title: typeof value.title === "string" && value.title ? value.title : null,
    message,
    createdAt: typeof value.created_at === "string" ? value.created_at : null,
  };
}

function updateTypeOf(value: unknown): UpdateType | null {
  if (
    value === "current" ||
    value === "added" ||
    value === "updated" ||
    value === "removed"
  ) {
    return value;
  }
  return null;
}

/** Newest first, matching how the rest of the Activity list reads. */
function sorted(items: PersistentNotification[]): PersistentNotification[] {
  return [...items].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export function subscribePersistentNotifications(
  subscribeMessage: <T>(
    message: Record<string, unknown>,
    onMessage: (result: T) => void,
  ) => Promise<() => void>,
  onNotifications: (notifications: PersistentNotification[]) => void,
): Promise<() => void> {
  const known = new Map<string, PersistentNotification>();

  return subscribeMessage<unknown>(
    { type: "persistent_notification/subscribe" },
    (raw) => {
      if (!isRecord(raw)) return;
      const update = updateTypeOf(raw.type);
      if (!update) return;
      const incoming = isRecord(raw.notifications) ? raw.notifications : {};

      if (update === "current") known.clear();

      for (const [id, value] of Object.entries(incoming)) {
        if (update === "removed") {
          known.delete(id);
          continue;
        }
        const parsed = parseNotification(id, value);
        if (parsed) known.set(id, parsed);
      }

      onNotifications(sorted([...known.values()]));
    },
  );
}

export async function dismissPersistentNotification(
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => Promise<void>,
  notificationId: string,
): Promise<void> {
  await callService("persistent_notification", "dismiss", {
    notification_id: notificationId,
  });
}
