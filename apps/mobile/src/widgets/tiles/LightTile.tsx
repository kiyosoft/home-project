import { deriveLight, formatFraction, isOnState } from "@ethio/ha-sdk";
import { useCallback } from "react";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";

import { useT } from "@/store/locale-store";
import { Slider } from "@/ui/haptic";
import { LightDetailBody } from "@/widgets/detail/LightDetailBody";
import { LampSwitch } from "@/widgets/light/LampSwitch";
import { useLightWash } from "@/widgets/light/light-wash";
import { useDimDrag } from "@/widgets/light/use-dim-drag";
import { singleSliderValue, type WidgetBodyProps } from "@/widgets/types";
import { useGroupTally } from "@/widgets/use-group";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

export function LightTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, sheet } = useTile(config);
  const light = deriveLight(entity);
  const { members, tally } = useGroupTally(config, entity, isOnState);
  const groupStatus =
    members.length > 1
      ? formatFraction(tally.active, tally.total, "on")
      : null;

  const [isOn, setOptimisticOn] = useOptimistic(light?.isOn ?? false);
  const [brightness, setOptimisticBrightness] = useOptimistic(
    light?.brightnessPercent ?? 0,
  );

  const wash = useLightWash(light && !unavailable ? { ...light, isOn } : null, {
    brightness: isOn ? brightness : 0,
  });

  const toggle = () => {
    if (unavailable) return;
    setOptimisticOn(!isOn);
    callService("light", isOn ? "turn_off" : "turn_on", {
      entity_id: entityId,
    });
  };

  const setBrightness = useCallback(
    (percent: number) => {
      setOptimisticBrightness(percent);
      setOptimisticOn(percent > 0);
      callService("light", percent > 0 ? "turn_on" : "turn_off", {
        entity_id: entityId,
        ...(percent > 0 ? { brightness_pct: percent } : {}),
      });
    },
    [setOptimisticBrightness, setOptimisticOn, callService, entityId],
  );

  // Painted while a drag or slider is in flight, so the lamp lights up under
  // the finger instead of waiting for the service call to land.
  const previewBrightness = useCallback(
    (percent: number) => {
      setOptimisticBrightness(percent);
      setOptimisticOn(percent > 0);
    },
    [setOptimisticBrightness, setOptimisticOn],
  );

  const dimmable = light?.supportsBrightness ?? false;

  // A full tile keeps the slider for a precise, discoverable drag; its pan
  // would fight a hold-and-drag on the same card. A half tile has no room for
  // a slider, so that is where holding the tile becomes the dimmer.
  // Colour lives in the detail sheet either way: two strips crowd a tile.
  const showSlider = size !== "sm" && dimmable;
  const canDrag = dimmable && !showSlider && !unavailable;

  const dim = useDimDrag({
    value: isOn ? brightness : 0,
    isDisabled: !canDrag,
    onChange: previewBrightness,
    onCommit: setBrightness,
  });

  const openDetail = () => {
    // The release that ends a drag still reads as a tap on the card.
    if (dim.justDragged()) return;
    sheet.open({
      title,
      body: <LightDetailBody entityId={entityId} />,
    });
  };

  const status = unavailable
    ? t("widget.state.unavailable")
    : groupStatus
      ? groupStatus
      : isOn
        ? light?.supportsBrightness
          ? t("widget.brightnessValue", { percent: brightness })
          : t("widget.state.on")
        : t("widget.state.off");

  const tile = (
    <WidgetTile
      title={title}
      status={status}
      icon={isOn ? "bulb" : "bulb-outline"}
      size={size}
      active={isOn && !unavailable}
      disabled={unavailable}
      tint={
        wash
          ? {
              overlay: wash.overlay,
              border: wash.border,
              fill: wash.fill,
              ink: wash.switchThumb,
            }
          : undefined
      }
      // Tapping opens the controls and the switch toggles. Holding is the
      // dimmer, so there is no long press left to open the sheet with.
      onPress={openDetail}
      accessory={
        <LampSwitch
          isSelected={isOn}
          onSelectedChange={toggle}
          isDisabled={unavailable}
          wash={wash}
        />
      }
    >
      {showSlider ? (
        <Slider
          value={brightness}
          onChange={(value) => previewBrightness(singleSliderValue(value))}
          onChangeEnd={(value) => setBrightness(singleSliderValue(value))}
          minValue={0}
          maxValue={100}
          step={1}
          isDisabled={unavailable}
          accessibilityLabel={t("widget.light.brightness")}
        >
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
    </WidgetTile>
  );

  if (!canDrag) return tile;

  // A plain View gives the detector a native view of its own to attach to,
  // rather than relying on the tile's root forwarding a ref.
  return (
    <GestureDetector gesture={dim.gesture}>
      <View className="flex-1">{tile}</View>
    </GestureDetector>
  );
}
