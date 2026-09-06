import type { MobileWidget, TileSize } from "@ethio/mobile-schema";
import { tileSpan } from "@ethio/mobile-schema";
import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";

import { useT } from "@/store/locale-store";
import { PressableFeedback } from "@/ui/haptic";
import { FADE_MS, SETTLE_MS } from "@/ui/motion";
import { TILE_GAP, tileColumn } from "@/widgets/tile-layout";
import { TileColumnProvider } from "@/widgets/tile-metrics";
import { WidgetRenderer } from "@/widgets/WidgetRenderer";
import { WidgetTile } from "@/widgets/WidgetTile";

const Icon = withUniwind(Ionicons);

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
      haptic={tone === "danger" ? "warn" : "tap"}
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

export interface TileRowProps {
  widgets: MobileWidget[];
  /**
   * Row width. The screen measures it once and hands it down, because a row
   * inside a virtualized list has to know its height on the frame it mounts.
   */
  width: number;
  columns: number;
  /** Edit mode's add tile, in this row's free slot or on its own. */
  withAdd?: boolean;
  /** Edit mode swaps tile controls for resize and remove badges. */
  editing?: boolean;
  onRemove?: (widgetId: string) => void;
  onResize?: (widgetId: string) => void;
  onAdd?: () => void;
}

/** One line of the tile grid. Sections are chunked into rows by `buildDashboardRows`. */
export function TileRow({
  widgets,
  width,
  columns,
  withAdd = false,
  editing = false,
  onRemove,
  onResize,
  onAdd,
}: TileRowProps) {
  const t = useT();
  const column = tileColumn(width, columns);

  return (
    <TileColumnProvider column={column}>
      <View className="flex-row items-stretch" style={{ gap: TILE_GAP }}>
        {widgets.map((widget) => {
          const size: TileSize = widget.size ?? "sm";
          const span = tileSpan(size);
          return (
            <Animated.View
              key={widget.id}
              layout={LinearTransition.duration(SETTLE_MS)}
              style={{
                width: span * column + TILE_GAP * (span - 1),
              }}
            >
              {/* Editing swallows taps so a resize never toggles the device. */}
              <View className="flex-1" pointerEvents={editing ? "none" : "auto"}>
                <WidgetRenderer widget={widget} />
              </View>
              {editing ? (
                <Animated.View
                  entering={FadeIn.duration(FADE_MS)}
                  exiting={FadeOut.duration(FADE_MS)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <Badge
                    icon={size === "lg" ? "contract" : "expand"}
                    label={t(
                      size === "sm"
                        ? "home.widthFull"
                        : size === "md"
                          ? "home.widthTall"
                          : "home.widthHalf",
                    )}
                    onPress={() => onResize?.(widget.id)}
                  />
                  <Badge
                    icon="close"
                    label={t("home.removeWidget")}
                    tone="danger"
                    onPress={() => onRemove?.(widget.id)}
                  />
                </Animated.View>
              ) : null}
            </Animated.View>
          );
        })}

        {withAdd ? (
          <View style={{ width: column }}>
            <WidgetTile
              title={t("home.addWidget")}
              icon="add"
              size="sm"
              onPress={onAdd}
            />
          </View>
        ) : null}
      </View>
    </TileColumnProvider>
  );
}
