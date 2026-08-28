import {
  CLEAR_NOTIFICATION,
  type MobileAppNotificationAction,
  type MobileAppPushNotification,
} from "@ethio/ha-sdk";
import * as Crypto from "expo-crypto";
import { create } from "zustand";

import type { PresentedNotification } from "@/lib/notifications";
import {
  clearNotificationHistory,
  loadNotificationHistory,
  saveNotificationHistory,
} from "@/lib/settings";

/** Old notifications stop being interesting long before they stop being cheap. */
const HISTORY_LIMIT = 200;

export interface NotificationRecord {
  id: string;
  title: string | null;
  message: string;
  receivedAt: number;
  tag: string | null;
  actions: MobileAppNotificationAction[];
  data: Record<string, unknown>;
  read: boolean;
}

interface NotificationState {
  records: NotificationRecord[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /**
   * Files an incoming push. Returns the stored record, or null when the payload
   * was a dismissal rather than something to show.
   */
  record: (
    notification: MobileAppPushNotification,
    origin?: RecordOrigin,
  ) => NotificationRecord | null;
  /**
   * Files pushes found in the notification tray on a cold start, leaving any we
   * already hold untouched so an old notification does not come back unread.
   */
  backfill: (entries: PresentedNotification[]) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => Promise<void>;
}

/**
 * Where an untagged notification came from. Reusing the OS's own id keeps a
 * remote push from being filed twice: once by the listener now, and again by the
 * cold-start backfill while it is still sitting in the tray.
 */
export interface RecordOrigin {
  id?: string;
  receivedAt?: number;
}

/**
 * Writes are queued rather than fired off in parallel. Two overlapping saves
 * finish in whatever order the disk decides, and the last one to land wins, so
 * an older snapshot could overwrite a newer one and silently drop whatever
 * arrived in between.
 */
let writes: Promise<unknown> = Promise.resolve();

function persist(records: NotificationRecord[]) {
  writes = writes
    .then(() => saveNotificationHistory(records))
    .catch(() => {
      // History is a convenience; losing a write must not surface as an error.
    });
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  records: [],
  hydrated: false,

  async hydrate() {
    const raw = await loadNotificationHistory();
    // Hydration races the socket: a push can land before disk comes back, and
    // replacing the list outright would drop it.
    const live = get().records;
    const records = merge(live, parseRecords(raw));
    set({ records, hydrated: true });

    // Whatever beat the disk read exists only in memory, and this merge is the
    // first moment both halves are in one list. Without writing it back, the
    // next save to run would be working from a list that never had it.
    if (live.length > 0) persist(records);
  },

  record(notification, origin) {
    // HA reuses the notify path to dismiss: same tag, magic message.
    if (notification.message === CLEAR_NOTIFICATION) {
      if (!notification.tag) return null;
      const remaining = get().records.filter(
        (entry) => entry.tag !== notification.tag,
      );
      set({ records: remaining });
      persist(remaining);
      return null;
    }

    const entry = toRecord(notification, origin);

    // A tagged notification replaces the earlier one rather than stacking.
    const others = get().records.filter((existing) => existing.id !== entry.id);
    const records = [entry, ...others].slice(0, HISTORY_LIMIT);
    set({ records });
    persist(records);
    return entry;
  },

  backfill(entries) {
    if (entries.length === 0) return;

    const known = new Set(get().records.map((entry) => entry.id));
    const added: NotificationRecord[] = [];

    for (const { notification, identifier, receivedAt } of entries) {
      if (notification.message === CLEAR_NOTIFICATION) continue;
      const entry = toRecord(notification, { id: identifier, receivedAt });
      if (known.has(entry.id)) continue;
      known.add(entry.id);
      added.push(entry);
    }

    if (added.length === 0) return;
    const records = [...added, ...get().records]
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .slice(0, HISTORY_LIMIT);
    set({ records });
    persist(records);
  },

  markAllRead() {
    const records = get().records.map((entry) =>
      entry.read ? entry : { ...entry, read: true },
    );
    set({ records });
    persist(records);
  },

  remove(id) {
    const records = get().records.filter((entry) => entry.id !== id);
    set({ records });
    persist(records);
  },

  async clear() {
    set({ records: [] });
    // Behind the same queue as the saves. A write still in flight would
    // otherwise land after the file was removed and bring the history back.
    writes = writes.then(clearNotificationHistory).catch(() => {
      // Nothing to report: the list is already empty on screen.
    });
    await writes;
  },
}));

function toRecord(
  notification: MobileAppPushNotification,
  origin?: RecordOrigin,
): NotificationRecord {
  return {
    // Ordered by how widely each id is shared. A tag is Home Assistant's own
    // identity for a notification and replaces the previous one. Failing that,
    // the confirm id is the same on both delivery routes, because Core stamps
    // it into the payload before sending and hands that same payload to the
    // `push_url` fallback: it is what collapses the socket copy and the relay
    // copy of one notification that was sent twice because our confirm did not
    // arrive in time. The OS id only identifies one delivery, and a random one
    // is a last resort that dedupes nothing.
    id:
      notification.tag ??
      notification.confirmId ??
      origin?.id ??
      Crypto.randomUUID(),
    title: notification.title,
    message: notification.message,
    receivedAt: origin?.receivedAt ?? Date.now(),
    tag: notification.tag,
    actions: notification.actions,
    data: notification.data,
    read: false,
  };
}

/** Live entries win over stored ones with the same id, which is the same tag. */
function merge(
  live: NotificationRecord[],
  stored: NotificationRecord[],
): NotificationRecord[] {
  if (live.length === 0) return stored;
  const byId = new Map(stored.map((entry) => [entry.id, entry]));
  for (const entry of live) byId.set(entry.id, entry);
  return [...byId.values()]
    .sort((a, b) => b.receivedAt - a.receivedAt)
    .slice(0, HISTORY_LIMIT);
}

export function unreadCount(records: NotificationRecord[]): number {
  return records.reduce((total, entry) => (entry.read ? total : total + 1), 0);
}

function parseRecords(value: unknown): NotificationRecord[] {
  if (!Array.isArray(value)) return [];
  const records: NotificationRecord[] = [];
  for (const entry of value) {
    const parsed = parseRecord(entry);
    if (parsed) records.push(parsed);
  }
  return records.slice(0, HISTORY_LIMIT);
}

function parseRecord(value: unknown): NotificationRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : "";
  const message = typeof raw.message === "string" ? raw.message : "";
  if (!id || !message) return null;

  return {
    id,
    title: typeof raw.title === "string" ? raw.title : null,
    message,
    receivedAt: typeof raw.receivedAt === "number" ? raw.receivedAt : Date.now(),
    tag: typeof raw.tag === "string" ? raw.tag : null,
    actions: parseActions(raw.actions),
    data:
      typeof raw.data === "object" && raw.data !== null
        ? (raw.data as Record<string, unknown>)
        : {},
    read: raw.read === true,
  };
}

function parseActions(value: unknown): MobileAppNotificationAction[] {
  if (!Array.isArray(value)) return [];
  const actions: MobileAppNotificationAction[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const raw = entry as Record<string, unknown>;
    if (typeof raw.action !== "string" || !raw.action) continue;
    const action: MobileAppNotificationAction = {
      action: raw.action,
      title: typeof raw.title === "string" ? raw.title : raw.action,
    };
    if (typeof raw.uri === "string" && raw.uri) action.uri = raw.uri;
    actions.push(action);
  }
  return actions;
}
