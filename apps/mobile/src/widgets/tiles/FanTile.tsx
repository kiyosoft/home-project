import { numericAttr } from "@ethio/ha-sdk";
import { Slider } from "heroui-native";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { isUnavailable } from "@/store/use-entity";
import {
  singleSliderValue,
  type WidgetBodyProps,
} from "@/widgets/types";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

export function FanTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, openEntityDetail } =
    useTile(config);
  const isOn = entity?.state === "on";
  const reported = numericAttr(entity?.attributes ?? {}, "percentage") ?? 0;
  const [percentage, setOptimisticPercentage] = useOptimistic(reported);
  const [optimisticOn, setOptimisticOn] = useOptimistic(isOn);
  const showSlider = size !== "sm";

  const toggle = () => {
    if (unavailable) return;
    setOptimisticOn(!optimisticOn);
    callService("fan", optimisticOn ? "turn_off" : "turn_on", {
      entity_id: entityId,
    });
  };

  const setPercent = (value: number) => {
    setOptimisticPercentage(value);
    setOptimisticOn(value > 0);
    callService("fan", "set_percentage", {
      entity_id: entityId,
      percentage: value,
    });
  };

  const on = optimisticOn && !unavailable;
  const missing = !entityId || isUnavailable(entity);

  return (
    <WidgetTile
      title={title || t("widget.fan.title")}
      status={
        missing
          ? t("widget.state.unavailable")
          : on
            ? t("widget.fan.onValue", { percent: Math.round(percentage) })
            : t("widget.state.off")
      }
      icon="sync-outline"
      size={size}
      active={on}
      disabled={unavailable}
      onPress={openEntityDetail}
      onLongPress={openEntityDetail}
      onIconPress={toggle}
      iconLabel={t("widget.action.power")}
    >
      {showSlider ? (
        <View>
          <Slider
            value={percentage}
            onChangeEnd={(value) => setPercent(singleSliderValue(value))}
            minValue={0}
            maxValue={100}
            step={1}
            isDisabled={unavailable}
            accessibilityLabel={t("widget.fan.speed")}
          >
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
        </View>
      ) : null}
    </WidgetTile>
  );
}
