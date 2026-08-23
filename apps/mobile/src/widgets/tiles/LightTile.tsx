import { deriveLight } from "@ethio/ha-sdk";
import { Slider, Switch } from "heroui-native";

import { useT } from "@/store/locale-store";
import { LightDetailBody } from "@/widgets/detail/LightDetailBody";
import { singleSliderValue, type WidgetBodyProps } from "@/widgets/types";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

export function LightTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, sheet } = useTile(config);
  const light = deriveLight(entity);

  const [isOn, setOptimisticOn] = useOptimistic(light?.isOn ?? false);
  const [brightness, setOptimisticBrightness] = useOptimistic(
    light?.brightnessPercent ?? 0,
  );

  const toggle = () => {
    if (unavailable) return;
    setOptimisticOn(!isOn);
    callService("light", isOn ? "turn_off" : "turn_on", { entity_id: entityId });
  };

  const setBrightness = (percent: number) => {
    setOptimisticBrightness(percent);
    setOptimisticOn(percent > 0);
    callService("light", percent > 0 ? "turn_on" : "turn_off", {
      entity_id: entityId,
      ...(percent > 0 ? { brightness_pct: percent } : {}),
    });
  };

  const openDetail = () => {
    sheet.open({
      title,
      body: <LightDetailBody entityId={entityId} />,
    });
  };

  const status = unavailable
    ? t("widget.state.unavailable")
    : isOn
      ? light?.supportsBrightness
        ? t("widget.brightnessValue", { percent: brightness })
        : t("widget.state.on")
      : t("widget.state.off");

  // A slider needs room to be draggable; a half tile gets the switch instead.
  const showSlider = size !== "sm" && (light?.supportsBrightness ?? false);

  return (
    <WidgetTile
      title={title}
      status={status}
      icon={isOn ? "bulb" : "bulb-outline"}
      size={size}
      active={isOn && !unavailable}
      disabled={unavailable}
      onPress={toggle}
      onLongPress={openDetail}
      accessory={
        <Switch
          isSelected={isOn}
          onSelectedChange={toggle}
          isDisabled={unavailable}
        />
      }
    >
      {showSlider ? (
        <Slider
          value={brightness}
          onChange={(value) => setOptimisticBrightness(singleSliderValue(value))}
          onChangeEnd={(value) => setBrightness(singleSliderValue(value))}
          minValue={0}
          maxValue={100}
          step={1}
          isDisabled={unavailable}
        >
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      ) : null}
    </WidgetTile>
  );
}
