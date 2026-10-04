import {
  activeAlerts,
  attentionItems,
  configEntityIds,
  type ActiveAlert,
  type AttentionItem,
} from "@ethio/ha-sdk";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileDashboard } from "@ethio/mobile-schema";
import { BottomSheet, Card, Text, useThemeColor } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { LinkButton, PressableFeedback } from "@/ui/haptic";

export function mobileWatchedIds(document: MobileDashboard | null): string[] {
  if (!document) return [];
  const ids = [...(document.favorites ?? [])];
  for (const section of document.sections) {
    if (section.source.kind === "explicit") {
      for (const widget of section.source.widgets) {
        ids.push(...configEntityIds(widget.config));
      }
    }
    if (section.source.kind === "scene") ids.push(...section.source.entities);
  }
  return ids;
}

function attentionDetail(item: AttentionItem, t: ReturnType<typeof useT>): string {
  if (item.kind === "battery" && item.level !== null) {
    return t("attention.level", { level: item.level });
  }
  if (item.kind === "unavailable") return t("attention.unavailable");
  if (item.kind === "safety") return t("attention.safety");
  if (item.kind === "problem") return t("attention.problem");
  if (item.kind === "opening") return t("attention.opening");
  if (item.kind === "unlocked") return t("attention.unlocked");
  if (item.kind === "jammed") return t("attention.jammed");
  if (item.kind === "alarm") return t("attention.alarm");
  return t("attention.battery");
}

function noticeTitle(
  item: AttentionItem | undefined,
  alert: ActiveAlert | undefined,
  t: ReturnType<typeof useT>,
): string {
  if (item) return `${item.name} ${attentionDetail(item, t)}`;
  return alert?.name ?? "";
}

function AlertRow({ alert }: { alert: ActiveAlert }) {
  const t = useT();
  const callService = useHaStore((state) => state.callService);

  return (
    <Card>
      <Card.Body className="gap-2">
        <Card.Title>{alert.name}</Card.Title>
        <LinkButton
          size="sm"
          className="self-start"
          onPress={() => {
            void callService("alert", "turn_off", {
              entity_id: alert.entityId,
            }).catch(() => {
              // HA keeps the entity on; the row stays.
            });
          }}
        >
          {t("alert.acknowledge")}
        </LinkButton>
      </Card.Body>
    </Card>
  );
}

/** One line for everything that needs attention. Tap it for the list. */
export function AlertBanner() {
  const t = useT();
  const muted = useThemeColor("foreground");
  const entities = useHaStore((state) => state.entities);
  const document = useDashboardStore((state) => state.document);
  const [open, setOpen] = useState(false);

  const attention = attentionItems(entities, mobileWatchedIds(document));
  const alerts = activeAlerts(entities);
  const count = attention.length + alerts.length;
  if (count === 0) return null;

  const summary = noticeTitle(attention[0], alerts[0], t);
  const extra = count > 1 ? ` · +${count - 1}` : "";
  const countLabel =
    count === 1 ? t("attention.countOne") : t("attention.count", { count });

  return (
    <View className="pt-4">
      <PressableFeedback
        accessibilityRole="button"
        accessibilityLabel={t("attention.open", { count: countLabel })}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
      >
        <Card>
          <Card.Body className="flex-row items-center gap-3">
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-muted text-xs font-medium">
                {t("attention.section")}
              </Text>
              <Text numberOfLines={1} className="text-sm font-medium">
                {summary}
                {extra}
              </Text>
            </View>
            <Text className="text-muted text-xs">{countLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={muted} />
          </Card.Body>
        </Card>
      </PressableFeedback>

      <BottomSheet isOpen={open} onOpenChange={setOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content>
            <BottomSheet.Title>{t("attention.section")}</BottomSheet.Title>
            <BottomSheet.Description>{countLabel}</BottomSheet.Description>
            <View className="gap-3 pb-8 pt-4">
              {attention.map((item) => (
                <Card key={item.entityId}>
                  <Card.Body className="gap-1">
                    <Card.Title>{item.name}</Card.Title>
                    <Card.Description>
                      {attentionDetail(item, t)}
                    </Card.Description>
                  </Card.Body>
                </Card>
              ))}
              {alerts.map((alert) => (
                <AlertRow key={alert.entityId} alert={alert} />
              ))}
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </View>
  );
}
