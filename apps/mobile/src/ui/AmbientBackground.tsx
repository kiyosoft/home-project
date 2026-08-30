import {
  lampColor,
  lightGlow,
  rgbaCss,
  TUNGSTEN,
  type Rgb,
} from "@ethio/ha-sdk";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

import { useHomeSummary } from "@/dashboard/home-summary";
import { WASH } from "@/ui/motion";

/** expo-linear-gradient needs at least two stops, hence the tuple. */
type GradientColors = readonly [string, string, ...string[]];

/**
 * How much of the tile-tuned glow ramp a full-screen wash may take. The tile
 * numbers are sized for a 168pt card; unscaled they turn the page into a filter.
 */
const CEILING = 0.6;

/** Light pools at the top of the screen and is gone by roughly two thirds down. */
const STOPS = [0, 0.35, 0.7] as const;

/**
 * The house's own light, spilled behind the Home screen. Apple Home does this
 * to make the app feel like a window onto the rooms rather than a list of them.
 *
 * Hue and ramp are static per render and the strength is animated, so dimming a
 * lamp fades the page smoothly while a colour change — rare, and always from
 * behind a fully faded-out wash — costs nothing to keep in sync.
 */
export function AmbientBackground() {
  const scheme = useColorScheme();
  const brightSurface = scheme !== "dark";
  const { lamp } = useHomeSummary();

  // A dark house keeps the last hue so fading out never shifts colour.
  const held = useRef<Rgb>(TUNGSTEN);
  if (lamp) held.current = lamp.color;

  const color = lampColor(lamp?.color ?? held.current);
  const glow = lightGlow(1, brightSurface);
  const peak = glow.far * CEILING;

  const colors: GradientColors = [
    rgbaCss(color, peak),
    rgbaCss(color, peak * 0.35),
    rgbaCss(color, 0),
  ];

  // Clamped out here, not in the worklet: the UI runtime can only call
  // functions that were workletized, and `clamp` is plain package code.
  const strength = lamp ? Math.min(1, Math.max(0, lamp.intensity)) : 0;

  const style = useAnimatedStyle(
    () => ({
      opacity: withTiming(strength, WASH),
    }),
    [strength],
  );

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={colors}
        locations={STOPS}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
