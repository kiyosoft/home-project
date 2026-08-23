import { Text } from "heroui-native";
import { View } from "react-native";

import type { MessageKey } from "@/i18n";
import { useT } from "@/store/locale-store";
import { TileButton } from "@/widgets/TileButton";
import type { WidgetBodyProps } from "@/widgets/types";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

const STATUS_KEYS: Record<string, MessageKey> = {
  open: "widget.state.open",
  closed: "widget.state.closed",
  opening: "widget.state.opening",
  closing: "widget.state.closing",
};

export function CoverTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, openEntityDetail } = useTile(config);

  const [state, setOptimisticState] = useOptimistic(entity?.state ?? "unknown");
  const position = entity?.attributes.current_position;
  const isClosed = state === "closed";
  const moving = state === "opening" || state === "closing";

  const send = (service: "open_cover" | "close_cover" | "stop_cover") => {
    if (unavailable) return;
    if (service !== "stop_cover") {
      setOptimisticState(service === "open_cover" ? "opening" : "closing");
    }
    callService("cover", service, { entity_id: entityId });
  };

  const statusKey = STATUS_KEYS[state];
  const label = unavailable
    ? t("widget.state.unavailable")
    : statusKey
      ? t(statusKey)
      : state;

  const showPosition = typeof position === "number" && !unavailable;
  const buttons =
    size !== "md" ? null : (
      <View className="flex-row gap-2">
        <TileButton
          icon="chevron-up"
          label={t("widget.cover.open")}
          onPress={() => send("open_cover")}
          disabled={unavailable}
        />
        <TileButton
          icon="stop"
          label={t("widget.cover.stop")}
          onPress={() => send("stop_cover")}
          disabled={unavailable || !moving}
        />
        <TileButton
          icon="chevron-down"
          label={t("widget.cover.close")}
          onPress={() => send("close_cover")}
          disabled={unavailable}
        />
      </View>
    );

  return (
    <WidgetTile
      title={title}
      status={label}
      icon={isClosed ? "square-outline" : "browsers-outline"}
      size={size}
      active={!isClosed && !unavailable}
      disabled={unavailable}
      onPress={openEntityDetail}
      onLongPress={openEntityDetail}
      onIconPress={() => send(isClosed ? "open_cover" : "close_cover")}
      iconLabel={t("widget.action.cover")}
    >
      {showPosition || buttons ? (
        <View className="flex-row items-end justify-between gap-2">
          {showPosition ? (
            <View className="flex-row items-baseline gap-1">
              <Text className="text-foreground text-3xl font-semibold">
                {Math.round(position)}
              </Text>
              <Text className="text-muted text-base">%</Text>
            </View>
          ) : (
            <View />
          )}
          {buttons}
        </View>
      ) : null}
    </WidgetTile>
  );
}
