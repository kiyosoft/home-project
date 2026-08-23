import { deriveLight } from "@ethio/ha-sdk";
import { Chip, Label, Slider, Surface, Switch, Text } from "heroui-native";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { useEntity } from "@/store/use-entity";
import { EntityDetailBody } from "@/widgets/EntityDetailBody";
import { singleSliderValue } from "@/widgets/types";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";

export function LightDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const callService = useCallService();
  const entity = useEntity(entityId);
  const light = deriveLight(entity);

  const [isOn, setOptimisticOn] = useOptimistic(light?.isOn ?? false);
  const [brightness, setOptimisticBrightness] = useOptimistic(
    light?.brightnessPercent ?? 0,
  );
  const [kelvin, setOptimisticKelvin] = useOptimistic(light?.colorTemp ?? 0);

  if (!light) {
    return <Text className="text-muted">{t("widget.entityMissing")}</Text>;
  }

  const toggle = (next: boolean) => {
    setOptimisticOn(next);
    callService("light", next ? "turn_on" : "turn_off", { entity_id: entityId });
  };

  const commitBrightness = (percent: number) => {
    setOptimisticBrightness(percent);
    setOptimisticOn(percent > 0);
    callService("light", percent > 0 ? "turn_on" : "turn_off", {
      entity_id: entityId,
      ...(percent > 0 ? { brightness_pct: percent } : {}),
    });
  };

  const commitKelvin = (value: number) => {
    setOptimisticKelvin(value);
    callService("light", "turn_on", {
      entity_id: entityId,
      color_temp_kelvin: value,
    });
  };

  const selectEffect = (effect: string) => {
    callService("light", "turn_on", { entity_id: entityId, effect });
  };

  const minKelvin = light.minColorTempKelvin ?? 2000;
  const maxKelvin = light.maxColorTempKelvin ?? 6500;

  return (
    <View className="gap-6">
      <Surface variant="secondary" className="rounded-inner flex-row items-center justify-between p-4">
        <Label>{t("widget.light.power")}</Label>
        <Switch isSelected={isOn} onSelectedChange={toggle} />
      </Surface>

      {light.supportsBrightness ? (
        <Slider
          value={brightness}
          onChange={(value) => setOptimisticBrightness(singleSliderValue(value))}
          onChangeEnd={(value) => commitBrightness(singleSliderValue(value))}
          minValue={0}
          maxValue={100}
          step={1}
        >
          <View className="mb-2 flex-row items-center justify-between">
            <Label>{t("widget.light.brightness")}</Label>
            <Text className="text-muted text-sm">
              {t("widget.brightnessValue", { percent: brightness })}
            </Text>
          </View>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      ) : null}

      {light.supportsColorTemp ? (
        <Slider
          value={Math.min(Math.max(kelvin, minKelvin), maxKelvin)}
          onChange={(value) => setOptimisticKelvin(singleSliderValue(value))}
          onChangeEnd={(value) => commitKelvin(singleSliderValue(value))}
          minValue={minKelvin}
          maxValue={maxKelvin}
          step={50}
        >
          <View className="mb-2 flex-row items-center justify-between">
            <Label>{t("widget.light.warmth")}</Label>
            <Text className="text-muted text-sm">
              {t("widget.kelvinValue", { kelvin })}
            </Text>
          </View>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      ) : null}

      {light.supportsEffects ? (
        <View className="gap-2">
          <Label>{t("widget.light.effects")}</Label>
          <View className="flex-row flex-wrap gap-2">
            {light.availableEffects.map((effect) => (
              <Chip
                key={effect}
                size="sm"
                variant={effect === light.effect ? "primary" : "secondary"}
                onPress={() => selectEffect(effect)}
              >
                {effect}
              </Chip>
            ))}
          </View>
        </View>
      ) : null}

      <EntityDetailBody entityId={entityId} />
    </View>
  );
}
