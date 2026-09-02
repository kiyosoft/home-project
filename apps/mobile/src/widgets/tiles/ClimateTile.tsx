import {
  CLIMATE_STEP,
  deriveClimate,
  stepClimateTarget,
  type ClimateView,
} from "@ethio/ha-sdk";
import { Text } from "heroui-native";
import { View } from "react-native";

import type { MessageKey, TranslateParams } from "@/i18n";
import { useT } from "@/store/locale-store";
import { TileButton } from "@/widgets/TileButton";
import type { WidgetBodyProps } from "@/widgets/types";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

function climateStatus(
  climate: ClimateView | null,
  unavailable: boolean,
  target: number,
  state: string | undefined,
  t: (key: MessageKey, params?: TranslateParams) => string,
): string {
  if (unavailable) return t("widget.state.unavailable");
  const unit = climate?.unit ?? "";
  const value = `${target}${unit}`;
  if (climate?.heating && climate.target != null) {
    return t("widget.climate.heatingTo", { value });
  }
  if (climate?.cooling && climate.target != null) {
    return t("widget.climate.coolingTo", { value });
  }
  if (climate?.current != null) {
    return t("widget.climate.currentValue", {
      value: `${climate.current}${unit}`,
    });
  }
  return state ?? "";
}

export function ClimateTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, openEntityDetail } = useTile(config);
  const climate = entity ? deriveClimate(entity) : null;
  const unit = climate?.unit ?? "";
  const [target, setOptimisticTarget] = useOptimistic(climate?.target ?? 0);
  const hasTarget = climate?.target != null;
  const isOff = !entity || climate?.isOff;
  const headline = climateStatus(
    climate,
    unavailable,
    target,
    entity?.state,
    t,
  );

  const step = (delta: number) => {
    if (unavailable || !hasTarget) return;
    const next = stepClimateTarget(target, delta);
    setOptimisticTarget(next);
    callService("climate", "set_temperature", {
      entity_id: entityId,
      temperature: next,
    });
  };

  return (
    <WidgetTile
      title={title}
      status={headline}
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
          {size !== "sm" ? (
            <View className="flex-row gap-2">
              <TileButton
                icon="remove"
                label={t("widget.climate.cooler")}
                onPress={() => step(-CLIMATE_STEP)}
                disabled={unavailable}
              />
              <TileButton
                icon="add"
                label={t("widget.climate.warmer")}
                onPress={() => step(CLIMATE_STEP)}
                disabled={unavailable}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </WidgetTile>
  );
}
