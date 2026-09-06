import {
  areaCoverStat,
  areaStat,
  areaSummary,
  deriveArea,
  entitiesInArea,
  unanimousService,
} from "@ethio/ha-sdk";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { GlassSurface } from "@/ui/GlassSurface";
import { cn } from "@/ui/cn";
import { PressableFeedback } from "@/ui/haptic";
import { useTileMinHeight } from "@/widgets/tile-metrics";
import { readString, type WidgetBodyProps } from "@/widgets/types";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";

const Icon = withUniwind(Ionicons);

export function AreaTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const areaId = readString(config, "area_id");
  const customTitle = readString(config, "title").trim();
  const { sheet } = useTile(config);
  const minHeight = useTileMinHeight(size);
  const areas = useHaStore((state) => state.areas);
  const areaByEntity = useHaStore((state) => state.areaByEntity);
  const entities = useHaStore((state) => state.entities);
  const [pending, setPending] = useState(false);

  const area = areas.find((entry) => entry.area_id === areaId);
  const overview = deriveArea(
    entities,
    areaId ? entitiesInArea(areaByEntity, areaId) : [],
  );
  const {
    lights,
    covers,
    climate,
    current,
    unit,
    lightIds,
    coverIds,
    climateIds,
  } = overview;
  const title = customTitle || area?.name || t("widget.area.title");
  const summary = areaSummary(overview, {
    ideal: t("widget.area.ideal"),
    empty: t("widget.area.noDevices"),
  });

  const runOn = (ids: string[], domain: string, service: string) => {
    if (pending || ids.length === 0) return;
    setPending(true);
    for (const id of ids) {
      callService(domain, service, { entity_id: id });
    }
    setPending(false);
  };

  const openClimate = () => {
    const first = climateIds[0];
    if (!first) return;
    const name =
      typeof entities[first]?.attributes.friendly_name === "string"
        ? entities[first].attributes.friendly_name
        : first;
    sheet.openEntity(first, name);
  };

  return (
    <GlassSurface
      level="tile"
      className="flex-1 p-4"
      style={{ minHeight }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-muted text-[11px] font-medium uppercase tracking-[0.14em]">
            {t("widget.area.kicker")}
          </Text>
          <Text
            numberOfLines={1}
            className="text-foreground mt-1 text-lg font-semibold"
          >
            {title}
          </Text>
        </View>
        <View className="bg-surface-tertiary size-10 items-center justify-center rounded-full">
          <Icon name="home-outline" size={20} className="text-muted" />
        </View>
      </View>
      <Text numberOfLines={2} className="text-muted mt-2 text-sm">
        {summary}
      </Text>
      <View className="mt-auto flex-row gap-2 pt-4">
        <AreaAction
          label={t("widget.area.lights")}
          value={areaStat(lights)}
          icon="bulb-outline"
          active={lights.active > 0}
          disabled={pending || lightIds.length === 0}
          onPress={() =>
            runOn(
              lightIds,
              "light",
              unanimousService(lights, "turn_on", "turn_off"),
            )
          }
        />
        <AreaAction
          label={t("widget.area.climate")}
          value={current != null ? `${current}${unit}` : "—"}
          icon="thermometer-outline"
          active={Boolean(climate && climate.state !== "off")}
          disabled={climateIds.length === 0}
          onPress={openClimate}
        />
        <AreaAction
          label={t("widget.area.blinds")}
          value={areaCoverStat(covers, {
            empty: "—",
            allOpen: t("widget.state.open"),
          })}
          icon="browsers-outline"
          active={covers.active > 0}
          disabled={pending || coverIds.length === 0}
          onPress={() =>
            runOn(
              coverIds,
              "cover",
              unanimousService(covers, "open_cover", "close_cover"),
            )
          }
        />
      </View>
    </GlassSurface>
  );
}

function AreaAction({
  label,
  value,
  icon,
  active,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PressableFeedback
      onPress={onPress}
      isDisabled={disabled}
      accessibilityLabel={`${label}, ${value}`}
      accessibilityRole="button"
      className="min-w-0 flex-1"
    >
      <View
        className={cn(
          "items-center gap-1 rounded-xl border px-1 py-3",
          active
            ? "border-accent/30 bg-accent/10"
            : "border-border bg-surface-tertiary/60",
          disabled && "opacity-40",
        )}
      >
        <Icon
          name={icon}
          size={16}
          className={active ? "text-accent" : "text-muted"}
        />
        <Text numberOfLines={1} className="text-muted text-[11px] font-medium">
          {label}
        </Text>
        <Text numberOfLines={1} className="text-foreground text-xs font-semibold">
          {value}
        </Text>
      </View>
    </PressableFeedback>
  );
}
