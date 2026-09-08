import { Card, Label, Text } from "heroui-native";
import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDashboardStore } from "@/store/dashboard-store";
import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { entityDomain, entityName } from "@/store/use-entity";
import { Button, Chip, LinkButton, Switch } from "@/ui/haptic";
import { defaultWatchEntityIds, isControllableEntityId } from "@/watch/catalog";
import { dispatchWatchCommand } from "@/watch/dispatch";
import { startWatchPaint } from "@/watch/native";
import type { WatchCommand } from "@/watch/types";
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

  const paintById = useMemo(
    () => new Map(model.map((entry) => [entry.entityId, entry])),
    [model],
  );
  const areaNameById = useMemo(
    () => new Map(areas.map((area) => [area.area_id, area.name])),
    [areas],
  );

  const candidates = useMemo(() => {
    const rows: {
      entityId: string;
      name: string;
      domain: string;
      area: string;
      painted: boolean;
      contested: boolean;
      mapped: boolean;
    }[] = [];
    for (const [entityId, entity] of Object.entries(entities)) {
      if (!isControllableEntityId(entityId)) continue;
      const paint = paintById.get(entityId);
      const areaId = areaByEntity[entityId];
      rows.push({
        entityId,
        name: entityName(entity, entityId),
        domain: entityDomain(entityId),
        area: areaNameById.get(areaId) ?? t("watch.unassigned"),
        painted: paint?.painted === true,
        contested: paint?.contested === true,
        mapped: paint?.mapped === true,
      });
    }
    return rows.sort((left, right) => left.name.localeCompare(right.name));
  }, [areaByEntity, areaNameById, entities, paintById, t]);

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
        <Card.Body className="gap-2">
          <Label>{t("watch.gestures")}</Label>
          <Card.Description>{t("watch.gesturesHelp")}</Card.Description>
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
                          : row.mapped
                            ? ` · ${t("watch.mapped")}`
                            : ` · ${t("watch.painted")}`
                        : ` · ${t("watch.unpainted")}`}
                    </Card.Description>
                    {on ? (
                      <View className="flex-row flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="self-start"
                          onPress={() => startWatchPaint(row.entityId)}
                        >
                          {row.painted ? t("watch.paintAgain") : t("watch.paint")}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="self-start"
                          onPress={() => {
                            void dispatchWatchCommand(
                              testCommand(row.entityId, row.domain, entities[row.entityId]?.state),
                            );
                          }}
                        >
                          {row.domain === "scene" || row.domain === "script"
                            ? t("watch.activate")
                            : row.domain === "lock"
                              ? t("watch.lock")
                              : t("watch.toggle")}
                        </Button>
                      </View>
                    ) : null}
                  </View>
                  <View className="items-end gap-1">
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
                    <Card.Description>{t("watch.onWrist")}</Card.Description>
                  </View>
                </View>
              );
            })
          )}
        </Card.Body>
      </Card>
    </ScrollView>
  );
}

function testCommand(
  entityId: string,
  domain: string,
  state: string | undefined,
): WatchCommand {
  if (domain === "scene" || domain === "script") {
    return { kind: "activate", entityId };
  }
  if (domain === "lock") {
    return {
      kind: state === "locked" || state === "locking" ? "unlock" : "lock",
      entityId,
    };
  }
  return { kind: "toggle", entityId };
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}
