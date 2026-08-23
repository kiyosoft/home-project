import Ionicons from "@expo/vector-icons/Ionicons";
import type { TileSize } from "@ethio/mobile-schema";
import { PressableFeedback, Text } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { cn } from "@/ui/cn";
import { GlassSurface } from "@/ui/GlassSurface";

const Icon = withUniwind(Ionicons);

/** Fixed heights keep a wrapped row of half tiles aligned without measuring content. */
export const TILE_HEIGHT: Record<TileSize, number> = {
  sm: 132,
  md: 132,
  lg: 208,
};

export interface WidgetTileProps {
  title: string;
  status?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  size: TileSize;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
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
  onPress,
  onLongPress,
  accessory,
  children,
}: WidgetTileProps) {
  return (
    <PressableFeedback
      onPress={onPress}
      onLongPress={onLongPress}
      isDisabled={disabled || (!onPress && !onLongPress)}
      accessibilityLabel={status ? `${title}, ${status}` : title}
    >
      <GlassSurface
        level="tile"
        interactive
        className="p-4"
        style={{ height: TILE_HEIGHT[size] }}
      >
        {active ? (
          <View className="bg-accent/15 absolute inset-0" pointerEvents="none" />
        ) : null}

        <View className={cn("flex-1", disabled && "opacity-50")}>
          <View className="min-h-7 flex-row items-start justify-between gap-2">
            {icon ? (
              <Icon
                name={icon}
                size={22}
                className={active ? "text-accent" : "text-muted"}
              />
            ) : (
              <View />
            )}
            {accessory}
          </View>

          <View className="flex-1 justify-end gap-3">
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
