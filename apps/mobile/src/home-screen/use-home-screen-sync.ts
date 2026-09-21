import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import {
  DEFAULT_DASHBOARD,
  ensureScenesSection,
} from "@/dashboard/default-dashboard";
import { t, type MessageKey, type TranslateParams } from "@/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { isLiveSession, useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";
import {
  unreadCount,
  useNotificationStore,
} from "@/store/notification-store";

import ActivityGlance from "./ActivityWidget";
import { shouldPushHomeSnapshot } from "./glance";
import HomeGlance from "./HomeWidget";
import { syncWidgetHub } from "./hub";
import {
  buildActivitySnapshot,
  buildHomeSnapshot,
  loadUpcomingTodos,
  snapshotKey,
} from "./snapshot";
import { takePendingTarget, type HomeGlanceProps } from "./types";

const PUSH_MS = 250;
const HUB_CATCHUP_MS = 2500;

let suppressHubSnapshotUntil = 0;

async function drainPending(): Promise<HomeGlanceProps | null> {
  try {
    const entries = await HomeGlance.getTimeline();
    const taken = takePendingTarget(entries.at(-1)?.props);
    if (!taken) return null;
    // Native already POSTed. Keep the optimistic glance until HA state lands.
    HomeGlance.updateSnapshot(taken.rest);
    suppressHubSnapshotUntil = Date.now() + HUB_CATCHUP_MS;
    return taken.rest;
  } catch {
    return null;
  }
}

/**
 * Pushes HA state into WidgetKit. Widget taps POST from the extension, so
 * this hook must not fire the same service again when the app comes back.
 */
export function useHomeScreenSync(): void {
  const lastHome = useRef("");
  const lastActivity = useRef("");
  const haHydrated = useHaStore((state) => state.hydrated);
  const mode = useHaStore((state) => state.mode);
  const status = useHaStore((state) => state.status);
  const entities = useHaStore((state) => state.entities);
  const registration = useHaStore((state) => state.registration);
  const activeUrl = useHaStore((state) => state.activeUrl);
  const profile = useHaStore((state) => state.profile);
  const saved = useDashboardStore((state) => state.document);
  const dashboardHydrated = useDashboardStore((state) => state.hydrated);
  const records = useNotificationStore((state) => state.records);
  const notificationsHydrated = useNotificationStore((state) => state.hydrated);
  const locale = useLocaleStore((state) => state.locale);
  const session = useHaStore((state) => state.session);

  useEffect(() => {
    void drainPending();
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") void drainPending();
    });
    return () => {
      appState.remove();
    };
  }, []);

  useEffect(() => {
    void syncWidgetHub();
  }, [registration, activeUrl, profile]);

  useEffect(() => {
    if (!haHydrated || !dashboardHydrated) return;

    let cancelled = false;
    const delay = Math.max(PUSH_MS, suppressHubSnapshotUntil - Date.now());
    const timer = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        const translate = (key: MessageKey, params?: TranslateParams) =>
          t(locale, key, params);
        const connected = isLiveSession(mode, status);
        const document = ensureScenesSection(saved ?? DEFAULT_DASHBOARD);

        try {
          const entries = await HomeGlance.getTimeline();
          const current = entries.at(-1)?.props;
          if (
            !shouldPushHomeSnapshot({
              currentConnected: current?.connected === true,
              nextConnected: connected,
              signedOut: session === "signed-out",
            })
          ) {
            return;
          }
        } catch {
          // First launch has no timeline yet.
        }

        const home = {
          ...buildHomeSnapshot({
            connected,
            entities,
            document,
            unread: unreadCount(records),
            t: translate,
          }),
          todos: connected
            ? await loadUpcomingTodos(
                entities,
                useHaStore.getState().sendMessagePromise,
              )
            : [],
        };
        const activity = buildActivitySnapshot({
          connected,
          records,
          t: translate,
        });

        const homeKey = snapshotKey(home);
        if (homeKey !== lastHome.current) {
          lastHome.current = homeKey;
          HomeGlance.updateSnapshot(home);
        }

        const activityKey = snapshotKey(activity);
        if (activityKey !== lastActivity.current) {
          lastActivity.current = activityKey;
          ActivityGlance.updateSnapshot(activity);
        }
      })();
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    haHydrated,
    dashboardHydrated,
    notificationsHydrated,
    mode,
    status,
    entities,
    saved,
    records,
    locale,
    session,
  ]);
}
