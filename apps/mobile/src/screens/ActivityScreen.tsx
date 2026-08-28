import {
  dismissPersistentNotification,
  type PersistentNotification,
} from "@ethio/ha-sdk";
import {
  LegendList,
  type LegendListRenderItemProps,
} from "@legendapp/list/react-native";
import { Button, Card, Chip, LinkButton, Text } from "heroui-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, View } from "react-native";

import { toIntlLocale } from "@/i18n";
import {
  notificationPermission,
  requestNotificationPermission,
  type PermissionState,
} from "@/lib/notifications";
import type { PushTokenFailure } from "@/lib/push-token";
import { useHaStore } from "@/store/ha-store";
import { useLocaleStore, useT } from "@/store/locale-store";
import {
  unreadCount,
  useNotificationStore,
  type NotificationRecord,
} from "@/store/notification-store";
import { usePersistentNotifications } from "@/store/use-persistent-notifications";
import { usePushSyncStore, type PushSync } from "@/store/use-push-token";
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
  const registration = useHaStore((state) => state.registration);
  const registrationFailure = useHaStore((state) => state.registrationFailure);
  const callService = useHaStore((state) => state.callService);

  const pushSync = usePushSyncStore((state) => state.sync);
  const pushRejected = usePushSyncStore((state) => state.tokenRejected);
  const pushDetail = "detail" in pushSync ? pushSync.detail : null;

  const intlLocale = toIntlLocale(locale);
  const unread = unreadCount(records);
  const permission = useNotificationPermission(registration !== null);
  const push = pushSummary(pushSync, pushRejected);

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

  const notice = registrationNotice({
    mode,
    registered: registration !== null,
    failure: registrationFailure,
  });

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

      {notice ? (
        <Card>
          <Card.Body>
            <Card.Description>{t(notice)}</Card.Description>
          </Card.Body>
        </Card>
      ) : null}

      {registration && permission.state === "undetermined" ? (
        <Card>
          <Card.Body className="gap-2">
            <Card.Title>{t("activity.permissionTitle")}</Card.Title>
            <Card.Description>{t("activity.permissionBody")}</Card.Description>
            <Button size="sm" className="self-start" onPress={permission.ask}>
              {t("activity.permissionAllow")}
            </Button>
          </Card.Body>
        </Card>
      ) : null}

      {registration && permission.state === "denied" ? (
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

      {registration && push ? (
        <Card>
          <Card.Body className="gap-2">
            <View className="flex-row items-center justify-between gap-3">
              <Card.Title>{t("activity.pushTitle")}</Card.Title>
              <Chip size="sm" variant="soft" color={push.color}>
                {t(push.state)}
              </Chip>
            </View>
            <Card.Description>{t(push.detail)}</Card.Description>
            {pushDetail ? (
              <Card.Description className="mt-1 opacity-60">
                {pushDetail}
              </Card.Description>
            ) : null}
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
    void notificationPermission().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [registered]);

  const ask = useCallback(() => {
    void requestNotificationPermission().then(setState);
  }, []);

  return { state, ask };
}

/**
 * Whether a notification will reach this phone with the app closed, which is a
 * different question from whether notifications work at all: the socket channel
 * covers the running app on its own. Silent while the permission cards are up,
 * since those are the more useful thing to read first.
 */
function pushSummary(sync: PushSync, rejected: boolean) {
  if (sync.status === "idle" || sync.status === "no-permission") return null;

  if (sync.status === "syncing") {
    return {
      color: "default",
      state: "activity.pushStatePending",
      detail: "activity.pushSyncing",
    } as const;
  }

  if (sync.status === "synced") {
    // A token Home Assistant accepted that the relay still cannot deliver to.
    // Sent successfully and useless, so this reads as off rather than on.
    return rejected
      ? ({
          color: "warning",
          state: "activity.pushStateOff",
          detail: "activity.pushRejected",
        } as const)
      : ({
          color: "success",
          state: "activity.pushStateOn",
          detail: "activity.pushSynced",
        } as const);
  }

  // Blocked and failed both carry the reason, which is what the union is for.
  if (sync.status === "blocked" || sync.status === "failed") {
    return {
      color: "warning",
      state: "activity.pushStateOff",
      detail: PUSH_FAILURE_DETAIL[sync.failure],
    } as const;
  }

  // Nothing left but a relay we cannot see, so there is no URL to register.
  return {
    color: "warning",
    state: "activity.pushStateOff",
    detail: "activity.pushNoRelay",
  } as const;
}

/**
 * `satisfies` rather than an annotation: the annotation would widen these to
 * `string` and lose the message keys, while this still fails to compile if a
 * new failure arrives without something to say about it.
 */
const PUSH_FAILURE_DETAIL = {
  simulator: "activity.pushSimulator",
  "no-project": "activity.pushNoProject",
  timeout: "activity.pushTimeout",
  unavailable: "activity.pushFailed",
  "ha-rejected": "activity.pushHaRejected",
  "no-registration": "activity.pushNoRegistration",
} as const satisfies Record<PushTokenFailure, string>;

function registrationNotice(state: {
  mode: string | null;
  registered: boolean;
  failure: string | null;
}) {
  if (state.mode !== "live") return null;
  switch (state.failure) {
    case "not-loaded":
      return "activity.registerFailedNotLoaded" as const;
    case "unauthorized":
      return "activity.registerFailedUnauthorized" as const;
    case "rejected":
      return "activity.registerFailedRejected" as const;
    case "unreachable":
    case "unknown":
      return "activity.registerFailedUnreachable" as const;
    default:
      return state.registered ? null : ("activity.notRegistered" as const);
  }
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
