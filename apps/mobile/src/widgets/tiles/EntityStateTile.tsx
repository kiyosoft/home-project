import { formatAllOrFraction, isDetectedState, stringAttr, type GroupTally, type HassEntity } from "@ethio/ha-sdk";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text } from "heroui-native";
import { View } from "react-native";

import type { MessageKey, TranslateParams } from "@/i18n";
import { useT } from "@/store/locale-store";
import { entityDomain } from "@/store/use-entity";
import type { WidgetBodyProps } from "@/widgets/types";
import { useGroupTally } from "@/widgets/use-group";
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

function sensorValue(
  unavailable: boolean,
  isBinary: boolean,
  grouped: boolean,
  tally: GroupTally,
  entity: HassEntity | undefined,
  t: (key: MessageKey, params?: TranslateParams) => string,
): string {
  if (unavailable) return "—";
  if (grouped) {
    return formatAllOrFraction(tally.active, tally.total, {
      all: "All on",
      none: "All off",
      word: "on",
    });
  }
  if (isBinary) {
    return entity?.state === "on"
      ? t("widget.state.detected")
      : t("widget.state.clear");
  }
  return entity?.state ?? "—";
}

export function EntityStateTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const { entityId, entity, title, unavailable, openEntityDetail } = useTile(config);
  const { members, tally } = useGroupTally(config, entity, isDetectedState);

  const deviceClass = stringAttr(entity?.attributes ?? {}, "device_class") ?? "";
  const unit = stringAttr(entity?.attributes ?? {}, "unit_of_measurement") ?? "";

  const isBinary = entityDomain(entityId) === "binary_sensor";
  const grouped = isBinary && members.length > 1;
  const active = isBinary && (grouped ? tally.active > 0 : entity?.state === "on");
  const value = sensorValue(unavailable, isBinary, grouped, tally, entity, t);

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
