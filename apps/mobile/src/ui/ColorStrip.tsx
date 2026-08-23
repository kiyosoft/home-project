import {
  hsvToRgb,
  kelvinToRgb,
  lampInk,
  rgbaCss,
  type Rgb,
} from "@ethio/ha-sdk";
import { LinearGradient } from "expo-linear-gradient";
import { Slider } from "heroui-native";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { singleSliderValue } from "@/widgets/types";

/** expo-linear-gradient needs at least two stops, hence the tuple. */
type GradientColors = readonly [string, string, ...string[]];

function gradient(stops: string[]): GradientColors {
  return stops as unknown as GradientColors;
}

const HUE_STOPS = gradient(
  [0, 60, 120, 180, 240, 300, 360].map((hue) =>
    rgbaCss(hsvToRgb({ h: hue, s: 1, v: 1 })),
  ),
);

const KELVIN_STEPS = 8;

const HORIZONTAL = { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } } as const;

export interface ColorStripProps {
  variant: "hue" | "kelvin";
  value: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  isDisabled?: boolean;
  /** Tints the thumb, e.g. the light's live RGB rather than the pure hue. */
  swatch?: Rgb;
  label: string;
}

/** A gradient track for picking hue or white point, dragged like a dimmer. */
export function ColorStrip({
  variant,
  value,
  min,
  max,
  onChange,
  onChangeEnd,
  isDisabled = false,
  swatch,
  label,
}: ColorStripProps) {
  const isHue = variant === "hue";
  const lowerBound = min ?? (isHue ? 0 : 2200);
  const upperBound = max ?? (isHue ? 360 : 6500);

  const colors = useMemo<GradientColors>(() => {
    if (isHue) return HUE_STOPS;
    const stops: string[] = [];
    for (let step = 0; step <= KELVIN_STEPS; step += 1) {
      const kelvin =
        lowerBound + ((upperBound - lowerBound) * step) / KELVIN_STEPS;
      stops.push(rgbaCss(kelvinToRgb(kelvin)));
    }
    return gradient(stops);
  }, [isHue, lowerBound, upperBound]);

  const thumb =
    swatch ?? (isHue ? hsvToRgb({ h: value, s: 1, v: 1 }) : kelvinToRgb(value));

  return (
    <Slider
      value={value}
      onChange={(next) => onChange?.(singleSliderValue(next))}
      onChangeEnd={(next) => onChangeEnd?.(singleSliderValue(next))}
      minValue={lowerBound}
      maxValue={upperBound}
      step={1}
      isDisabled={isDisabled}
      accessibilityLabel={label}
    >
      <Slider.Track
        className="h-7 overflow-hidden rounded-full bg-transparent"
        background={null}
      >
        <LinearGradient
          colors={colors}
          start={HORIZONTAL.start}
          end={HORIZONTAL.end}
          style={StyleSheet.absoluteFill}
        />
        <Slider.Thumb
          styles={{
            thumbContainer: { backgroundColor: rgbaCss(lampInk(thumb)) },
            thumbKnob: { backgroundColor: rgbaCss(thumb) },
          }}
        />
      </Slider.Track>
    </Slider>
  );
}
