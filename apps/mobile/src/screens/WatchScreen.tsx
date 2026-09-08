import { Card, Label, Text } from "heroui-native";
import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { entityName } from "@/store/use-entity";
import { Button, Chip, LinkButton, Switch } from "@/ui/haptic";
import { defaultWatchEntityIds, isSnappableEntityId } from "@/watch/catalog";
import { startWatchPaint } from "@/watch/native";
import { useWatchStore } from "@/watch/watch-store";

export function WatchScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const mode = useHaStore((state) => state.mode);
  const entities = useHaStore((state) => state.entities);
  const areas = useHaStore((state) => state.areas);
  const areaByEntity = useHaStore((state) => state.areaByEntity);
  const document = useDashboardStore((state) => state.document);
  const selectedIds = useWatchStore((state) => state.entityIds);
  const status = useWatchStore((state) => state.status);
  const model = useWatchStore((state) => state.model);
  const atHome = useWatchStore((state) => state.atHome);
  const toggleEntity = useWatchStore((state) => state.toggleEntity);
  const setEntityIds = useWatchStore((state) => state.setEntityIds);

  const resolvedIds = useMemo(() => {
    if (selectedIds !== null) return selectedIds;
    return defaultWatchEntityIds(document, entities);
  }, [document, entities, selectedIds]);

  const selected = useMemo(() => new Set(resolvedIds), [resolvedIds]);

  const candidates = useMemo(() => {
    const rows: {
      entityId: string;
      name: string;
      area: string;
      painted: boolean;
      contested: boolean;
    }[] = [];
    for (const [entityId, entity] of Object.entries(entities)) {
      if (!isSnappableEntityId(entityId)) continue;
      const paint = model.find((entry) => entry.entityId === entityId);
      const areaId = areaByEntity[entityId];
      const areaName =
        areas.find((area) => area.area_id === areaId)?.name ??
        t("watch.unassigned");
      rows.push({
        entityId,
        name: entityName(entity, entityId),
        area: areaName,
        painted: paint?.painted === true,
        contested: paint?.contested === true,
      });
    }
    return rows.sort((left, right) => left.name.localeCompare(right.name));
  }, [areaByEntity, areas, entities, model, t]);

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-5 pb-28"
      contentContainerStyle={{ paddingTop: insets.top + 24 }}
    >
      <View className="gap-2">
        <LinkButton
          size="sm"
          className="self-start"
          onPress={() => router.back()}
        >
          {t("common.back")}
        </LinkButton>
        <Text.Heading type="h1">{t("watch.title")}</Text.Heading>
        <Text.Paragraph color="muted">{t("watch.description")}</Text.Paragraph>
      </View>

      <Card>
        <Card.Body className="gap-2">
          <Label>{t("watch.status")}</Label>
          {!status.available ? (
            <Card.Description>{t("watch.unavailable")}</Card.Description>
          ) : !status.paired ? (
            <Card.Description>{t("watch.unpaired")}</Card.Description>
          ) : !status.appInstalled ? (
            <Card.Description>{t("watch.notInstalled")}</Card.Description>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              <Chip size="sm" color={status.reachable ? "success" : "warning"} variant="soft">
                {status.reachable ? t("watch.reachable") : t("watch.unreachable")}
              </Chip>
              <Chip size="sm" color={atHome ? "success" : "warning"} variant="soft">
                {atHome ? t("watch.atHome") : t("watch.away")}
              </Chip>
              {status.available && !status.hasCompass && status.reachable ? (
                <Chip size="sm" color="danger" variant="soft">
                  {t("watch.noCompassChip")}
                </Chip>
              ) : null}
            </View>
          )}
          {mode === "demo" ? (
            <Card.Description>{t("watch.demoHint")}</Card.Description>
          ) : null}
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="gap-3">
          <Label>{t("watch.devices")}</Label>
          <Card.Description>{t("watch.devicesHelp")}</Card.Description>
          {candidates.length === 0 ? (
            <Card.Description>{t("watch.noDevices")}</Card.Description>
          ) : (
            candidates.map((row) => {
              const on = selected.has(row.entityId);
              return (
                <View
                  key={row.entityId}
                  className="flex-row items-center justify-between gap-3"
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Label>{row.name}</Label>
                    <Card.Description>
                      {row.area}
                      {row.painted
                        ? row.contested
                          ? ` · ${t("watch.contested")}`
                          : ` · ${t("watch.painted")}`
                        : ` · ${t("watch.unpainted")}`}
                    </Card.Description>
                    {on ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="self-start"
                        onPress={() => startWatchPaint(row.entityId)}
                      >
                        {t("watch.paint")}
                      </Button>
                    ) : null}
                  </View>
                  <Switch
                    isSelected={on}
                    onSelectedChange={(next) => {
                      if (selectedIds === null) {
                        const base = defaultWatchEntityIds(document, entities);
                        setEntityIds(
                          next
                            ? unique([...base, row.entityId])
                            : base.filter((id) => id !== row.entityId),
                        );
                        return;
                      }
                      toggleEntity(row.entityId, next);
                    }}
                  />
                </View>
              );
            })
          )}
        </Card.Body>
      </Card>
    </ScrollView>
  );
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}
