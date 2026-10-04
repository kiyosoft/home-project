import { useEffect, useState } from "react";

import Ionicons from "@expo/vector-icons/Ionicons";
import {
  deriveRemote,
  fetchEntityPlatform,
  remotePress,
  remoteSeesTv,
  showsTvRemote,
  type RemoteCommand,
} from "@ethio/ha-sdk";
import { Label, Text } from "heroui-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { useT } from "@/store/locale-store";
import { useHaStore } from "@/store/ha-store";
import { useEntity } from "@/store/use-entity";
import { cn } from "@/ui/cn";
import { Chip, PressableFeedback } from "@/ui/haptic";
import { EntityDetailBody } from "@/widgets/EntityDetailBody";
import type { WidgetBodyProps } from "@/widgets/types";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

const Icon = withUniwind(Ionicons);

function Key({
  icon,
  label,
  onPress,
  className,
  iconClassName,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <PressableFeedback
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        "size-12 items-center justify-center rounded-full",
        className,
      )}
    >
      <Icon name={icon} size={22} className={cn("text-foreground", iconClassName)} />
    </PressableFeedback>
  );
}

function useEntityPlatform(entityId: string): string | undefined {
  const send = useHaStore((state) => state.sendMessagePromise);
  const [platform, setPlatform] = useState<string | undefined>();
  useEffect(() => {
    let live = true;
    void fetchEntityPlatform(send, entityId).then((next) => {
      if (live) setPlatform(next);
    });
    return () => {
      live = false;
    };
  }, [entityId, send]);
  return platform;
}

/** Handheld remote for a TV. Hidden for speakers. */
export function RemoteControls({ entityId }: { entityId: string }) {
  const t = useT();
  const entity = useEntity(entityId);
  const entities = useHaStore((state) => state.entities);
  const awake = entity ? remoteSeesTv(entity, entities) : false;
  const platform = useEntityPlatform(entityId);
  const callService = useCallService();

  if (!showsTvRemote(entity, entities)) return null;

  const press = (command: RemoteCommand) => {
    const call = remotePress(platform, command, entityId);
    if (!call) return;
    callService(call.domain, call.service, call.data);
  };

  return (
    <View className="items-center">
      <View className="border-border bg-surface w-60 items-center gap-6 rounded-[36px] border px-6 pt-5 pb-8">
        <View className="w-full flex-row justify-end">
          <Key
            icon="power"
            label={awake ? t("widget.remote.powerOff") : t("widget.remote.powerOn")}
            onPress={() => press(awake ? "powerOff" : "power")}
            iconClassName="text-danger"
          />
        </View>

        <View className="border-border bg-surface-tertiary relative size-56 items-center justify-center rounded-full border">
          <View className="absolute top-1">
            <Key
              icon="chevron-up"
              label={t("widget.remote.up")}
              onPress={() => press("up")}
            />
          </View>
          <View className="absolute bottom-1">
            <Key
              icon="chevron-down"
              label={t("widget.remote.down")}
              onPress={() => press("down")}
            />
          </View>
          <View className="absolute left-1">
            <Key
              icon="chevron-back"
              label={t("widget.remote.left")}
              onPress={() => press("left")}
            />
          </View>
          <View className="absolute right-1">
            <Key
              icon="chevron-forward"
              label={t("widget.remote.right")}
              onPress={() => press("right")}
            />
          </View>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={t("widget.remote.ok")}
            onPress={() => press("ok")}
            className="bg-surface size-16 items-center justify-center rounded-full"
          >
            <Text className="text-foreground text-sm font-semibold">
              {t("widget.remote.ok")}
            </Text>
          </PressableFeedback>
        </View>

        <View className="w-full flex-row justify-between px-2">
          <Key
            icon="arrow-undo"
            label={t("widget.remote.back")}
            onPress={() => press("back")}
            className="bg-surface-tertiary"
          />
          <Key
            icon="home"
            label={t("widget.remote.home")}
            onPress={() => press("home")}
            className="bg-surface-tertiary"
          />
        </View>

        <View className="border-border bg-surface-tertiary items-center rounded-full border py-1">
          <Key
            icon="add"
            label={t("widget.remote.volumeUp")}
            onPress={() => press("volumeUp")}
          />
          <View className="bg-border h-px w-6" />
          <Key
            icon="remove"
            label={t("widget.remote.volumeDown")}
            onPress={() => press("volumeDown")}
          />
        </View>
      </View>
    </View>
  );
}

function RemoteDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const entity = useEntity(entityId);
  const entities = useHaStore((state) => state.entities);
  const view = deriveRemote(entity);
  const callService = useCallService();

  if (!view) {
    return <Text className="text-muted">{t("widget.entityMissing")}</Text>;
  }

  return (
    <View className="gap-6">
      <RemoteControls entityId={entityId} />

      {view.activities.length > 0 ? (
        <View className="gap-2">
          <Label>{t("widget.remote.activity")}</Label>
          <View className="flex-row flex-wrap gap-2">
            {view.activities.map((activity) => (
              <Chip
                key={activity}
                size="sm"
                variant={activity === view.activity ? "primary" : "secondary"}
                onPress={() =>
                  callService("remote", "turn_on", {
                    entity_id: entityId,
                    activity,
                  })
                }
              >
                {activity}
              </Chip>
            ))}
          </View>
        </View>
      ) : null}

      <EntityDetailBody entityId={entityId} />
    </View>
  );
}

export function RemoteTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, sheet } = useTile(config);
  const entities = useHaStore((state) => state.entities);
  const view = deriveRemote(entity);
  const awake = entity ? remoteSeesTv(entity, entities) : false;
  const platform = useEntityPlatform(entityId);

  const openDetail = () => {
    sheet.open({
      title,
      body: <RemoteDetailBody entityId={entityId} />,
    });
  };

  const togglePower = () => {
    if (!entityId) return;
    const call = remotePress(platform, awake ? "powerOff" : "power", entityId);
    if (!call) return;
    callService(call.domain, call.service, call.data);
  };

  return (
    <WidgetTile
      title={title}
      status={
        unavailable
          ? t("widget.state.unavailable")
          : (view?.activity ??
            (awake ? t("widget.state.on") : t("widget.state.off")))
      }
      icon="tv"
      size={size}
      active={awake && !unavailable}
      disabled={!entity}
      onPress={openDetail}
      onLongPress={openDetail}
      onIconPress={togglePower}
      iconLabel={t("widget.media.power")}
    />
  );
}
