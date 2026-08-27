import {
  subscribePersistentNotifications,
  type PersistentNotification,
} from "@ethio/ha-sdk";
import { useEffect, useState } from "react";

import { hasSession, useHaStore } from "@/store/ha-store";

/**
 * Home Assistant's own notification drawer, live over the socket. Separate from
 * our push inbox: these belong to the instance and are dismissed there.
 */
export function usePersistentNotifications(): PersistentNotification[] {
  const status = useHaStore((state) => state.status);
  const subscribeMessage = useHaStore((state) => state.subscribeMessage);
  const [notifications, setNotifications] = useState<PersistentNotification[]>(
    [],
  );

  const session = hasSession(status);

  useEffect(() => {
    if (!session) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void subscribePersistentNotifications(subscribeMessage, (next) => {
      if (!cancelled) setNotifications(next);
    })
      .then((dispose) => {
        if (cancelled) {
          dispose();
          return;
        }
        unsubscribe = dispose;
      })
      .catch(() => {
        // Demo mode and very old instances have nothing to subscribe to.
        if (!cancelled) setNotifications([]);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [session, subscribeMessage]);

  return notifications;
}
