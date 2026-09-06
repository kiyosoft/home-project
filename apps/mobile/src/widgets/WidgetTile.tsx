import { hexToRgb, rgbaCss } from "@ethio/ha-sdk";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { TileSize } from "@ethio/mobile-schema";
import { Text, useThemeColor } from "heroui-native";
import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";

import { cn } from "@/ui/cn";
import { PressableFeedback } from "@/ui/haptic";
import { GlassSurface, GLASS_RADIUS } from "@/ui/GlassSurface";
import { FADE_MS, PRESS_SCALE, SPRING, WASH } from "@/ui/motion";
import { useTileMinHeight } from "@/widgets/tile-metrics";

const Icon = withUniwind(Ionicons);

/** How much of the tile's own colour an unlit-but-active tile takes. */
const ACCENT_WASH_ALPHA = 0.15;

/** The disc behind the glyph. Wide enough to be the tile's icon-press target. */
const WELL_SIZE = 40;

/** A tile lit by its own device, e.g. a light painting the card its color. */
export interface TileTint {
  overlay: string;
  border: string;
  /** Solid device colour for the icon well, e.g. the lamp at full power. */
  fill?: string;
  /** Drawn on top of `fill`, when the plain accent would clash with the tint. */
  ink?: string;
}

export interface WidgetTileProps {
  title: string;
  status?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  size: TileSize;
  active?: boolean;
  disabled?: boolean;
  /** Replaces the generic active overlay with a device-coloured wash. */
  tint?: TileTint;
  onPress?: () => void;
  onLongPress?: () => void;
  /**
   * Turns the icon into the tile's primary action — toggle the switch, throw
   * the bolt — leaving the card itself to open the detail sheet.
   */
  onIconPress?: () => void;
  iconLabel?: string;
  /** Opposite the icon: a switch or a small readout. */
  accessory?: ReactNode;
  /** Between the icon row and the label: a brightness slider, cover buttons. */
  children?: ReactNode;
}

/**
 * The card every tile shares. The web dashboard leaves this to each widget; on
 * a phone the shell is centralised so glass, radius, and press feedback stay
 * identical across the grid.
 */
export function WidgetTile({
  title,
  status,
  icon,
  size,
  active = false,
  disabled = false,
  tint,
  onPress,
  onLongPress,
  onIconPress,
  iconLabel,
  accessory,
  children,
}: WidgetTileProps) {
  const [accent, accentForeground, muted, well] = useThemeColor([
    "accent",
    "accent-foreground",
    "muted",
    "surface-tertiary",
  ]);
  const minHeight = useTileMinHeight(size);

  const accentRgb = hexToRgb(accent);
  const accentWash = accentRgb
    ? rgbaCss(accentRgb, ACCENT_WASH_ALPHA)
    : accent;

  const lit = tint ? tint.overlay : active ? accentWash : null;
  const rim = tint ? tint.border : "transparent";

  // The well is the tile's loudest signal: off it is a quiet disc, on it fills
  // with the accent or with the device's own colour.
  const on = active && !disabled;
  const wellColor = on ? (tint?.fill ?? accent) : well;
  const glyphColor = on ? (tint?.ink ?? accentForeground) : muted;

  // An unlit tile fades its own last colour out. Animating straight to
  // transparent would cross through black on the way.
  const held = useRef({ color: accentWash, rim });
  if (lit) held.current = { color: lit, rim };

  const color = lit ?? held.current.color;
  const border = lit ? rim : held.current.rim;
  const visible = lit !== null;

  const washStyle = useAnimatedStyle(
    () => ({
      backgroundColor: withTiming(color, WASH),
      borderColor: withTiming(border, WASH),
      opacity: withTiming(visible ? 1 : 0, WASH),
    }),
    [color, border, visible],
  );

  const wellStyle = useAnimatedStyle(
    () => ({
      backgroundColor: withTiming(wellColor, WASH),
      // The well swells as the device comes on, which reads at a glance from
      // across a scrolling grid where a colour change alone does not.
      transform: [{ scale: withSpring(on ? 1.06 : 1, SPRING) }],
    }),
    [wellColor, on],
  );

  // A tile scrolling into view is a mount, not a state change. Without this
  // every glyph in the grid fades in as you scroll, which reads as a stutter.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  // The well sits flush left with the title below it, sized to be pressed, so
  // every tile heads its content the same way.
  const glyph = icon ? (
    <Animated.View
      style={[
        {
          width: WELL_SIZE,
          height: WELL_SIZE,
          borderRadius: WELL_SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
        },
        wellStyle,
      ]}
    >
      {/* Keyed on both so swapping outline for filled, or off ink for on ink,
          cross-fades rather than snapping. */}
      <Animated.View
        key={`${icon}:${glyphColor}`}
        style={[
          StyleSheet.absoluteFill,
          { alignItems: "center", justifyContent: "center" },
        ]}
        entering={mounted.current ? FadeIn.duration(FADE_MS) : undefined}
        exiting={mounted.current ? FadeOut.duration(FADE_MS) : undefined}
      >
        <Icon name={icon} size={20} style={{ color: glyphColor }} />
      </Animated.View>
    </Animated.View>
  ) : null;

  return (
    <PressableFeedback
      onPress={onPress}
      onLongPress={onLongPress}
      isDisabled={disabled || (!onPress && !onLongPress)}
      accessibilityLabel={status ? `${title}, ${status}` : title}
      animation={PRESS_SCALE}
      className="flex-1"
    >
      <GlassSurface
        level="tile"
        interactive
        className="flex-1 p-4"
        style={{ minHeight }}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: GLASS_RADIUS.tile,
              borderCurve: "continuous",
              borderWidth: 1,
            },
            washStyle,
          ]}
          pointerEvents="none"
        />

        <View className={cn("flex-1", disabled && "opacity-50")}>
          <View className="flex-row items-center justify-between gap-2">
            {!icon ? (
              <View style={{ width: WELL_SIZE, height: WELL_SIZE }} />
            ) : onIconPress ? (
              <PressableFeedback
                onPress={onIconPress}
                isDisabled={disabled}
                haptic="toggle"
                accessibilityLabel={iconLabel}
                accessibilityRole="button"
              >
                {glyph}
              </PressableFeedback>
            ) : (
              glyph
            )}
            {accessory}
          </View>

          <View className="flex-1 justify-end gap-4">
            {children}
            <View className="gap-0.5">
              <Text
                numberOfLines={1}
                className="text-foreground text-base font-semibold"
              >
                {title}
              </Text>
              {status ? (
                <Text numberOfLines={1} className="text-muted text-[13px]">
                  {status}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </GlassSurface>
    </PressableFeedback>
  );
}
