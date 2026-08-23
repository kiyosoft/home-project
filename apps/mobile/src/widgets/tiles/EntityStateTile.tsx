import Ionicons from "@expo/vector-icons/Ionicons";
import { Text } from "heroui-native";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { entityDomain } from "@/store/use-entity";
import type { WidgetBodyProps } from "@/widgets/types";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

const DEVICE_CLASS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  temperature: "thermometer-outline",
  humidity: "water-outline",
  pressure: "speedometer-outline",
  battery: "battery-half-outline",
  power: "flash-outline",
  energy: "flash-outline",
  illuminance: "sunny-outline",
  door: "log-in-outline",
  window: "browsers-outline",
  motion: "walk-outline",
  occupancy: "people-outline",
  moisture: "water-outline",
  smoke: "flame-outline",
};

export function EntityStateTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const { entityId, entity, title, unavailable, openEntityDetail } = useTile(config);

  const deviceClass =
    typeof entity?.attributes.device_class === "string"
      ? entity.attributes.device_class
      : "";
  const unit =
    typeof entity?.attributes.unit_of_measurement === "string"
      ? entity.attributes.unit_of_measurement
      : "";

  const isBinary = entityDomain(entityId) === "binary_sensor";
  const active = isBinary && entity?.state === "on";

  const value = unavailable
    ? "—"
    : isBinary
      ? entity?.state === "on"
        ? t("widget.state.detected")
        : t("widget.state.clear")
      : (entity?.state ?? "—");

  return (
    <WidgetTile
      title={title}
      status={unavailable ? t("widget.state.unavailable") : undefined}
      icon={DEVICE_CLASS_ICONS[deviceClass] ?? "analytics-outline"}
      size={size}
      active={active}
      disabled={unavailable}
      onPress={openEntityDetail}
      onLongPress={openEntityDetail}
    >
      <View className="flex-row items-baseline gap-1">
        <Text numberOfLines={1} className="text-foreground text-3xl font-semibold">
          {value}
        </Text>
        {unit && !unavailable ? (
          <Text className="text-muted text-base">{unit}</Text>
        ) : null}
      </View>
    </WidgetTile>
  );
}
