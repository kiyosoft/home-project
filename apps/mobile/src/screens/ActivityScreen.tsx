import {
  dismissPersistentNotification,
  type PersistentNotification,
} from "@ethio/ha-sdk";
import {
  LegendList,
  type LegendListRenderItemProps,
} from "@legendapp/list/react-native";
import { Card, Text } from "heroui-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Linking, View } from "react-native";

import { toIntlLocale } from "@/i18n";
import {
  notificationPermission,
  requestNotificationPermission,
  type PermissionState,
} from "@/lib/notifications";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore, useT } from "@/store/locale-store";
import {
  unreadCount,
  useNotificationStore,
  type NotificationRecord,
} from "@/store/notification-store";
import { usePersistentNotifications } from "@/store/use-persistent-notifications";
import { retryPushSync } from "@/store/use-push-token";
import { Button, Chip, LinkButton } from "@/ui/haptic";
import { Screen } from "@/ui/Screen";

const ESTIMATED_ROW_HEIGHT = 96;
/** Below this a wall-clock time says less than "just now". */
const JUST_NOW_MS = 60_000;

type Row =
  | { kind: "header"; id: string; label: string }
  | { kind: "hub"; id: string; notification: PersistentNotification }
  | { kind: "push"; id: string; record: NotificationRecord };

export function ActivityScreen() {
  const t = useT();
  const locale = useLocaleStore((state) => state.locale);

  const records = useNotificationStore((state) => state.records);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const clear = useNotificationStore((state) => state.clear);
  const hub = usePersistentNotifications();

  const mode = useHaStore((state) => state.mode);
  const registered = useHaStore((state) => state.registration !== null);
  const callService = useHaStore((state) => state.callService);

  const intlLocale = toIntlLocale(locale);
  const unread = unreadCount(records);
  const permission = useNotificationPermission(registered);

  const rows = useMemo<Row[]>(() => {
    const next: Row[] = [];
    if (hub.length > 0) {
      next.push({
        kind: "header",
        id: "header-hub",
        label: t("activity.hubSection"),
      });
      for (const notification of hub) {
        next.push({
          kind: "hub",
          id: `hub-${notification.notificationId}`,
          notification,
        });
      }
    }
    if (records.length > 0) {
      next.push({
        kind: "header",
        id: "header-push",
        label: t("activity.pushSection"),
      });
      for (const record of records) {
        next.push({ kind: "push", id: `push-${record.id}`, record });
      }
    }
    return next;
  }, [hub, records, t]);

  const dismiss = useCallback(
    (notificationId: string) => {
      void dismissPersistentNotification(callService, notificationId).catch(
        () => {
          // The list is driven by HA; a failed dismiss just leaves the row.
        },
      );
    },
    [callService],
  );

  const renderRow = useCallback(
    ({ item }: LegendListRenderItemProps<Row>) => {
      if (item.kind === "header") {
        return (
          <View className="px-1 pb-2 pt-5">
            <Text className="text-muted text-sm font-medium uppercase">
              {item.label}
            </Text>
          </View>
        );
      }

      if (item.kind === "hub") {
        return (
          <View className="pb-3">
            <Card>
              <Card.Body className="gap-2">
                {item.notification.title ? (
                  <Card.Title>{item.notification.title}</Card.Title>
                ) : null}
                <Card.Description>
                  {item.notification.message}
                </Card.Description>
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-muted text-xs">
                    {formatWhen(
                      item.notification.createdAt
                        ? Date.parse(item.notification.createdAt)
                        : null,
                      intlLocale,
                      t("activity.justNow"),
                    )}
                  </Text>
                  <LinkButton
                    size="sm"
                    onPress={() => dismiss(item.notification.notificationId)}
                  >
                    {t("activity.dismiss")}
                  </LinkButton>
                </View>
              </Card.Body>
            </Card>
          </View>
        );
      }

      return (
        <View className="pb-3">
          <Card>
            <Card.Body className="gap-2">
              {item.record.title ? (
                <Card.Title>{item.record.title}</Card.Title>
              ) : null}
              <Card.Description>{item.record.message}</Card.Description>
              <View className="flex-row items-center gap-2">
                <Text className="text-muted text-xs">
                  {formatWhen(
                    item.record.receivedAt,
                    intlLocale,
                    t("activity.justNow"),
                  )}
                </Text>
                {!item.record.read ? (
                  <Chip size="sm" color="accent" variant="soft">
                    {t("activity.new")}
                  </Chip>
                ) : null}
              </View>
            </Card.Body>
          </Card>
        </View>
      );
    },
    [dismiss, intlLocale, t],
  );

  const header = (
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text.Heading type="h1">{t("activity.title")}</Text.Heading>
        {unread > 0 ? (
          <Chip size="sm" color="accent" variant="soft">
            {t("activity.unread", { count: unread })}
          </Chip>
        ) : null}
      </View>

      {registered && permission.state === "undetermined" ? (
        <Card>
          <Card.Body className="gap-2">
            <Card.Title>{t("activity.permissionTitle")}</Card.Title>
            <Button size="sm" className="self-start" onPress={permission.ask}>
              {t("activity.permissionAllow")}
            </Button>
          </Card.Body>
        </Card>
      ) : null}

      {registered && permission.state === "denied" ? (
        <Card>
          <Card.Body className="gap-2">
            <Card.Description>
              {t("activity.permissionDenied")}
            </Card.Description>
            <LinkButton
              size="sm"
              className="self-start"
              onPress={() => void Linking.openSettings()}
            >
              {t("activity.permissionOpenSettings")}
            </LinkButton>
          </Card.Body>
        </Card>
      ) : null}

      {records.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onPress={markAllRead}
            isDisabled={unread === 0}
          >
            {t("activity.markAllRead")}
          </Button>
          <Button size="sm" variant="tertiary" onPress={() => void clear()}>
            {t("activity.clear")}
          </Button>
        </View>
      ) : null}
    </View>
  );

  const empty = (
    <View className="pt-6">
      <Card>
        <Card.Body className="gap-2">
          <Card.Title>{t("activity.empty")}</Card.Title>
          <Card.Description>
            {mode === "demo" ? t("activity.emptyDemo") : t("activity.emptyBody")}
          </Card.Description>
        </Card.Body>
      </Card>
    </View>
  );

  return (
    <Screen>
      <LegendList
        data={rows}
        renderItem={renderRow}
        keyExtractor={(row) => row.id}
        getItemType={(row) => row.kind}
        estimatedItemSize={ESTIMATED_ROW_HEIGHT}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 112 }}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
      />
    </Screen>
  );
}

/**
 * Asked for here rather than on cold start: Activity is the one screen where
 * "let us notify you" needs no explaining.
 */
function useNotificationPermission(registered: boolean) {
  const [state, setState] = useState<PermissionState | null>(null);

  useEffect(() => {
    if (!registered) return;
    let cancelled = false;

    const read = () => {
      void notificationPermission().then((next) => {
        if (!cancelled) setState(next);
      });
    };

    read();
    const foreground = AppState.addEventListener("change", (next) => {
      if (next === "active") read();
    });

    return () => {
      cancelled = true;
      foreground.remove();
    };
  }, [registered]);

  const ask = useCallback(() => {
    void requestNotificationPermission().then((next) => {
      setState(next);
      if (next === "granted") retryPushSync();
    });
  }, []);

  return { state, ask };
}

function formatWhen(
  timestamp: number | null,
  intlLocale: string,
  justNow: string,
): string {
  if (timestamp === null || Number.isNaN(timestamp)) return "";
  if (Date.now() - timestamp < JUST_NOW_MS) return justNow;
  return new Date(timestamp).toLocaleString(intlLocale);
}
