import { addUserInteractionListener } from "expo-widgets";
import { useEffect, useRef } from "react";

import {
  DEFAULT_DASHBOARD,
  ensureScenesSection,
} from "@/dashboard/default-dashboard";
import { t, type MessageKey, type TranslateParams } from "@/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore } from "@/store/locale-store";
import {
  unreadCount,
  useNotificationStore,
} from "@/store/notification-store";

import ActivityGlance from "./ActivityWidget";
import { dispatchWidgetTarget, targetFromWidgetEvent } from "./dispatch";
import HomeGlance from "./HomeWidget";
import {
  buildActivitySnapshot,
  buildHomeSnapshot,
  snapshotKey,
} from "./snapshot";

const PUSH_MS = 250;

/**
 * Pushes HA state into WidgetKit and routes widget taps back into callService.
 * The widget process can flip its own props; this is what actually talks to
 * the hub, and only while the companion is alive.
 */
export function useHomeScreenSync(): void {
  const lastHome = useRef("");
  const lastActivity = useRef("");

  useEffect(() => {
    const subscription = addUserInteractionListener((event) => {
      dispatchWidgetTarget(targetFromWidgetEvent(event));
    });
    return () => subscription.remove();
  }, []);

  const haHydrated = useHaStore((state) => state.hydrated);
  const session = useHaStore((state) => state.session);
  const entities = useHaStore((state) => state.entities);
  const saved = useDashboardStore((state) => state.document);
  const dashboardHydrated = useDashboardStore((state) => state.hydrated);
  const records = useNotificationStore((state) => state.records);
  const notificationsHydrated = useNotificationStore((state) => state.hydrated);
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    if (!haHydrated || !dashboardHydrated) return;

    const timer = setTimeout(() => {
      const translate = (key: MessageKey, params?: TranslateParams) =>
        t(locale, key, params);
      const connected = session === "active";
      const document = ensureScenesSection(saved ?? DEFAULT_DASHBOARD);

      const home = buildHomeSnapshot({
        connected,
        entities,
        document,
        unread: unreadCount(records),
        t: translate,
      });
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
    }, PUSH_MS);

    return () => clearTimeout(timer);
  }, [
    haHydrated,
    dashboardHydrated,
    notificationsHydrated,
    session,
    entities,
    saved,
    records,
    locale,
  ]);
}
