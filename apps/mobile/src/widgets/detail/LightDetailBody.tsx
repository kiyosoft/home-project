import {
  currentHue,
  deriveLight,
  hueToRgb,
  kelvinToRgb,
  resolveKelvin,
  type Rgb,
} from "@ethio/ha-sdk";
import { Chip, Label, Slider, Surface, Text } from "heroui-native";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { useEntity } from "@/store/use-entity";
import { ColorStrip } from "@/ui/ColorStrip";
import { EntityDetailBody } from "@/widgets/EntityDetailBody";
import { LampSwitch } from "@/widgets/light/LampSwitch";
import { useLightWash } from "@/widgets/light/light-wash";
import { singleSliderValue } from "@/widgets/types";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";

export function LightDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const callService = useCallService();
  const entity = useEntity(entityId);
  const light = deriveLight(entity);

  const minKelvin = resolveKelvin(light?.minColorTempKelvin) ?? 2200;
  const maxKelvin = resolveKelvin(light?.maxColorTempKelvin) ?? 6500;

  const [isOn, setOptimisticOn] = useOptimistic(light?.isOn ?? false);
  const [brightness, setOptimisticBrightness] = useOptimistic(
    light?.brightnessPercent ?? 0,
  );
  const [kelvin, setOptimisticKelvin] = useOptimistic(
    resolveKelvin(light?.colorTemp) ?? minKelvin,
  );
  const [hue, setOptimisticHue] = useOptimistic(
    light ? currentHue(light.rgbColor) : 0,
  );

  // Only override the color mid-drag: hueToRgb saturates a white light, which
  // would paint a plain bulb vivid the rest of the time.
  const huePending =
    light != null && light.supportsRgb && hue !== currentHue(light.rgbColor);
  const kelvinPending =
    light != null &&
    !light.supportsRgb &&
    light.supportsColorTemp &&
    kelvin !== resolveKelvin(light.colorTemp);

  let pendingColor: Rgb | undefined;
  if (huePending && light) pendingColor = hueToRgb(hue, light.rgbColor);
  else if (kelvinPending) pendingColor = kelvinToRgb(kelvin);

  const wash = useLightWash(light ? { ...light, isOn } : null, {
    brightness: isOn ? brightness : 0,
    color: pendingColor,
  });

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

  const commitHue = (value: number) => {
    setOptimisticHue(value);
    callService("light", "turn_on", {
      entity_id: entityId,
      rgb_color: hueToRgb(value, light.rgbColor).map(Math.round),
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

  return (
    <View className="gap-6">
      <Surface
        variant="secondary"
        className="rounded-inner flex-row items-center justify-between p-4"
        // Rim only: the surface keeps its own fill.
        style={
          wash ? { borderWidth: 1, borderColor: wash.border } : undefined
        }
      >
        <Label>{t("widget.light.power")}</Label>
        <LampSwitch isSelected={isOn} onSelectedChange={toggle} wash={wash} />
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
          <Slider.Track
            style={wash ? { backgroundColor: wash.track } : undefined}
          >
            <Slider.Fill
              style={wash ? { backgroundColor: wash.fill } : undefined}
            />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      ) : null}

      {light.supportsRgb ? (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Label>{t("widget.light.color")}</Label>
            <Text className="text-muted text-sm">
              {t("widget.hueValue", { hue })}
            </Text>
          </View>
          <ColorStrip
            variant="hue"
            value={hue}
            onChange={setOptimisticHue}
            onChangeEnd={commitHue}
            swatch={hueToRgb(hue, light.rgbColor)}
            label={t("widget.light.color")}
          />
        </View>
      ) : null}

      {light.supportsColorTemp ? (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Label>{t("widget.light.warmth")}</Label>
            <Text className="text-muted text-sm">
              {t("widget.kelvinValue", { kelvin })}
            </Text>
          </View>
          <ColorStrip
            variant="kelvin"
            value={Math.min(Math.max(kelvin, minKelvin), maxKelvin)}
            min={minKelvin}
            max={maxKelvin}
            onChange={setOptimisticKelvin}
            onChangeEnd={commitKelvin}
            label={t("widget.light.warmth")}
          />
        </View>
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
