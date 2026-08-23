import Ionicons from "@expo/vector-icons/Ionicons";
import type { MobileWidget, TileSize } from "@ethio/mobile-schema";
import { tileSpan } from "@ethio/mobile-schema";
import { PressableFeedback } from "heroui-native";
import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { withUniwind } from "uniwind";

import { useT } from "@/store/locale-store";
import { WidgetRenderer } from "@/widgets/WidgetRenderer";
import { WidgetTile } from "@/widgets/WidgetTile";

const Icon = withUniwind(Ionicons);

const GAP = 16;
const COLUMNS = 2;

export interface TileGridProps {
  widgets: MobileWidget[];
  /** Edit mode swaps tile controls for resize and remove badges, plus an add tile. */
  editing?: boolean;
  onRemove?: (widgetId: string) => void;
  onResize?: (widgetId: string) => void;
  onAdd?: () => void;
}

function Badge({
  icon,
  label,
  tone = "neutral",
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: "neutral" | "danger";
  onPress: () => void;
}) {
  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      className={`size-8 items-center justify-center rounded-full ${
        tone === "danger" ? "bg-danger" : "bg-surface-tertiary"
      }`}
    >
      <Icon
        name={icon}
        size={18}
        className={tone === "danger" ? "text-danger-foreground" : "text-foreground"}
      />
    </PressableFeedback>
  );
}

/**
 * Two-column wrap. Widths come from a measured container rather than the
 * window, so the grid stays correct inside any padding a screen applies.
 */
export function TileGrid({
  widgets,
  editing = false,
  onRemove,
  onResize,
  onAdd,
}: TileGridProps) {
  const t = useT();
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next !== width) setWidth(next);
  };

  const column = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View
      className="flex-row flex-wrap items-stretch"
      style={{ gap: GAP }}
      onLayout={onLayout}
    >
      {width > 0 ? (
        <>
          {widgets.map((widget) => {
            const size: TileSize = widget.size ?? "sm";
            return (
              <View
                key={widget.id}
                style={{ width: tileSpan(size) === 1 ? column : width }}
              >
                {/* Editing swallows taps so a resize never toggles the device. */}
                <View className="flex-1" pointerEvents={editing ? "none" : "auto"}>
                  <WidgetRenderer widget={widget} />
                </View>
                {editing ? (
                  <View className="absolute right-2 top-2 flex-row gap-2">
                    <Badge
                      icon={size === "sm" ? "expand" : "contract"}
                      label={t(
                        size === "sm" ? "home.widthFull" : "home.widthHalf",
                      )}
                      onPress={() => onResize?.(widget.id)}
                    />
                    <Badge
                      icon="close"
                      label={t("home.removeWidget")}
                      tone="danger"
                      onPress={() => onRemove?.(widget.id)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}

          {editing ? (
            <View style={{ width: column }}>
              <WidgetTile
                title={t("home.addWidget")}
                icon="add"
                size="sm"
                onPress={onAdd}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
