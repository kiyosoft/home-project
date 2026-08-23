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

  return (
    <WidgetTile
      title={title}
      status={
        typeof position === "number" && !unavailable
          ? t("widget.cover.positionValue", { label, percent: position })
          : label
      }
      icon={isClosed ? "square-outline" : "browsers-outline"}
      size={size}
      active={!isClosed && !unavailable}
      disabled={unavailable}
      onPress={openEntityDetail}
      onLongPress={openEntityDetail}
    >
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
    </WidgetTile>
  );
}
