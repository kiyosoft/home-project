import { Text } from "heroui-native";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { TileButton } from "@/widgets/TileButton";
import type { WidgetBodyProps } from "@/widgets/types";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

const STEP = 0.5;

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function ClimateTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, openEntityDetail } = useTile(config);

  const attrs = entity?.attributes ?? {};
  const unit = typeof attrs.temperature_unit === "string" ? attrs.temperature_unit : "";
  const current = num(attrs.current_temperature);
  const [target, setOptimisticTarget] = useOptimistic(num(attrs.temperature) ?? 0);

  const isOff = !entity || entity.state === "off";
  const hasTarget = num(attrs.temperature) != null;

  const step = (delta: number) => {
    if (unavailable || !hasTarget) return;
    const next = Math.round((target + delta) * 2) / 2;
    setOptimisticTarget(next);
    callService("climate", "set_temperature", {
      entity_id: entityId,
      temperature: next,
    });
  };

  return (
    <WidgetTile
      title={title}
      status={
        unavailable
          ? t("widget.state.unavailable")
          : current != null
            ? t("widget.climate.currentValue", { value: `${current}${unit}` })
            : (entity?.state ?? "")
      }
      icon={isOff ? "thermometer-outline" : "flame-outline"}
      size={size}
      active={!isOff && !unavailable}
      disabled={unavailable}
      onPress={openEntityDetail}
      onLongPress={openEntityDetail}
    >
      {hasTarget ? (
        <View className="flex-row items-end justify-between gap-2">
          <View className="flex-row items-baseline gap-1">
            <Text className="text-foreground text-3xl font-semibold">{target}</Text>
            <Text className="text-muted text-base">{unit}</Text>
          </View>
          {/* The setpoint needs a stop either side of it; a half tile sends the
              stepper to the detail sheet rather than squeeze it in. */}
          {size === "md" ? (
            <View className="flex-row gap-2">
              <TileButton
                icon="remove"
                label={t("widget.climate.cooler")}
                onPress={() => step(-STEP)}
                disabled={unavailable}
              />
              <TileButton
                icon="add"
                label={t("widget.climate.warmer")}
                onPress={() => step(STEP)}
                disabled={unavailable}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </WidgetTile>
  );
}
