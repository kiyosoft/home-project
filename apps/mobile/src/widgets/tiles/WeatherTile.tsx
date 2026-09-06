import {
  compactTemperatureUnit,
  deriveWeather,
  joinFacts,
  weatherSparklinePath,
  WEATHER_SPARKLINE,
} from "@ethio/ha-sdk";
import { Text } from "heroui-native";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useT } from "@/store/locale-store";
import { GlassSurface } from "@/ui/GlassSurface";
import { PressableFeedback } from "@/ui/haptic";
import { useTileMinHeight } from "@/widgets/tile-metrics";
import type { WidgetBodyProps } from "@/widgets/types";
import { useTile } from "@/widgets/use-tile";

function formatHour(date: Date, index: number): string {
  if (index === 0) return "Now";
  return date
    .toLocaleTimeString(undefined, { hour: "numeric" })
    .replace(" ", "");
}

function WeatherSparkline({
  points,
  unit,
}: {
  points: { at: Date; temperature: number }[];
  unit: string;
}) {
  const path = weatherSparklinePath(points);
  if (!path) return null;

  return (
    <View className="pt-3">
      <Svg
        viewBox={`0 0 ${WEATHER_SPARKLINE.width} ${WEATHER_SPARKLINE.height}`}
        width="100%"
        height={WEATHER_SPARKLINE.height}
        accessibilityElementsHidden
      >
        <Path
          d={path}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <View className="mt-1 flex-row justify-between">
        {points.map((point, index) => (
          <Text
            key={`${point.at.getTime()}-${point.temperature}`}
            className="text-muted text-[11px]"
          >
            {formatHour(point.at, index)}
            {index === points.length - 1 ? ` ${point.temperature}${unit}` : ""}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function WeatherTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const { entityId, entity, title, unavailable, openEntityDetail } =
    useTile(config);
  const minHeight = useTileMinHeight(size);
  const weather = deriveWeather(entity);

  if (!entityId || !weather || unavailable) {
    return (
      <GlassSurface level="tile" className="flex-1 p-4" style={{ minHeight }}>
        <Text className="text-foreground text-base font-semibold">
          {title || t("widget.weather.title")}
        </Text>
        <Text className="text-muted mt-2 text-sm">
          {entityId
            ? t("widget.state.unavailable")
            : t("widget.weather.pick")}
        </Text>
      </GlassSurface>
    );
  }

  const unit = compactTemperatureUnit(weather.temperatureUnit);
  const condition = weather.state.replace(/-/g, " ");
  const meta = joinFacts([
    weather.apparent != null
      ? t("widget.weather.feelsLike", { value: `${weather.apparent}${unit}` })
      : null,
    weather.humidity != null ? `${weather.humidity}%` : null,
    weather.windSpeed != null
      ? `${weather.windSpeed} ${weather.windUnit}`
      : null,
  ]);

  return (
    <PressableFeedback
      onPress={openEntityDetail}
      onLongPress={openEntityDetail}
      accessibilityLabel={title}
      className="flex-1"
    >
    <GlassSurface
      level="tile"
      interactive
      className="flex-1 p-4"
      style={{ minHeight }}
    >
      <Text className="text-muted text-[11px] font-medium uppercase tracking-[0.14em]">
        {t("widget.weather.title")}
      </Text>
      <Text numberOfLines={1} className="text-foreground mt-1 text-base font-semibold">
        {title}
      </Text>
      <Text className="text-foreground mt-3 text-4xl font-semibold">
        {weather.temperature != null ? `${weather.temperature}${unit}` : "—"}
      </Text>
      <Text className="text-muted mt-1 text-sm capitalize">{condition}</Text>
      {meta ? (
        <Text className="text-muted mt-2 text-xs">{meta}</Text>
      ) : null}
      <View className="mt-auto">
        <WeatherSparkline points={weather.forecast} unit={unit} />
      </View>
    </GlassSurface>
    </PressableFeedback>
  );
}
