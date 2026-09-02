import {
  averageNumericStates,
  discoverTemperatureSensors,
  stringList,
} from "@ethio/ha-sdk";
import { Text } from "heroui-native";
import { useMemo } from "react";
import { View } from "react-native";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { readString, type WidgetBodyProps } from "@/widgets/types";
import { WidgetTile } from "@/widgets/WidgetTile";

export function ClimateSensorsTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const customTitle = readString(config, "title").trim();
  const entityIds = config.entity_ids;
  const configured = useMemo(() => stringList(entityIds), [entityIds]);
  const entities = useHaStore((state) => state.entities);
  const ids = useMemo(
    () =>
      configured.length > 0
        ? configured
        : discoverTemperatureSensors(entities),
    [configured, entities],
  );
  const stats = useMemo(
    () => averageNumericStates(entities, ids),
    [entities, ids],
  );
  const value =
    stats.average == null ? "—" : `${stats.average}${stats.unit || "°"}`;

  return (
    <WidgetTile
      title={customTitle || t("widget.climateSensors.title")}
      status={
        stats.count === 0
          ? t("widget.climateSensors.none")
          : t("widget.climateSensors.average", { count: stats.count })
      }
      icon="eye-outline"
      size={size}
      active={stats.count > 0}
    >
      <View className="flex-row items-baseline gap-1">
        <Text className="text-foreground text-3xl font-semibold">{value}</Text>
      </View>
    </WidgetTile>
  );
}
