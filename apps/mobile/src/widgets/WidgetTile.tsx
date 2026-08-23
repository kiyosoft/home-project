import Ionicons from "@expo/vector-icons/Ionicons";
import type { TileSize } from "@ethio/mobile-schema";
import { PressableFeedback, Text } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { cn } from "@/ui/cn";
import { GlassSurface } from "@/ui/GlassSurface";

const Icon = withUniwind(Ionicons);

/**
 * A floor, not a height: a tile grows to fit its controls, because content that
 * overflows a fixed box lands on top of the icon rather than being clipped.
 * Half tiles stay level with each other because the grid stretches a row.
 */
export const TILE_MIN_HEIGHT: Record<TileSize, number> = {
  sm: 132,
  md: 148,
};

/** A tile lit by its own device, e.g. a light painting the card its color. */
export interface TileTint {
  overlay: string;
  border: string;
  /** Icon and other accents, when the plain accent would clash with the tint. */
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
  // The glyph sits flush left with the title below it, inside a box wide
  // enough to press, so every tile heads its content the same way.
  const iconBox = "size-10 items-start justify-center";
  const glyph = icon ? (
    <Icon
      name={icon}
      size={22}
      className={active && !tint?.ink ? "text-accent" : "text-muted"}
      style={tint?.ink ? { color: tint.ink } : undefined}
    />
  ) : null;

  return (
    <PressableFeedback
      onPress={onPress}
      onLongPress={onLongPress}
      isDisabled={disabled || (!onPress && !onLongPress)}
      accessibilityLabel={status ? `${title}, ${status}` : title}
      className="flex-1"
    >
      <GlassSurface
        level="tile"
        interactive
        className="flex-1 p-4"
        style={[
          { minHeight: TILE_MIN_HEIGHT[size] },
          tint ? { borderWidth: 1, borderColor: tint.border } : null,
        ]}
      >
        {tint ? (
          <View
            className="absolute inset-0"
            style={{ backgroundColor: tint.overlay }}
            pointerEvents="none"
          />
        ) : active ? (
          <View className="bg-accent/15 absolute inset-0" pointerEvents="none" />
        ) : null}

        <View className={cn("flex-1", disabled && "opacity-50")}>
          <View className="min-h-10 flex-row items-center justify-between gap-2">
            {!icon ? (
              <View className="size-10" />
            ) : onIconPress ? (
              <PressableFeedback
                onPress={onIconPress}
                isDisabled={disabled}
                accessibilityLabel={iconLabel}
                accessibilityRole="button"
                className={iconBox}
              >
                {glyph}
              </PressableFeedback>
            ) : (
              <View className={iconBox}>{glyph}</View>
            )}
            {accessory}
          </View>

          <View className="flex-1 justify-end gap-4">
            {children}
            <View className="gap-0.5">
              <Text
                numberOfLines={1}
                className="text-foreground text-base font-medium"
              >
                {title}
              </Text>
              {status ? (
                <Text numberOfLines={1} className="text-muted text-sm">
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
