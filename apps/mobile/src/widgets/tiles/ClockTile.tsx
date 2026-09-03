import { CLOCK_TICK_MS, clockFace, padClock } from "@ethio/ha-sdk";
import { Text } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { useLocaleStore } from "@/store/locale-store";
import { GlassSurface } from "@/ui/GlassSurface";
import { useTileMinHeight } from "@/widgets/tile-metrics";
import { readString, type WidgetBodyProps } from "@/widgets/types";

const RING = 14;
const RING_C = 2 * Math.PI * RING;

function SecondsFace({
  progress,
  seconds,
}: {
  progress: number;
  seconds: number;
}) {
  return (
    <View className="relative h-14 w-14 items-center justify-center">
      <Svg width={56} height={56} viewBox="0 0 36 36">
        <Circle
          cx="18"
          cy="18"
          r={RING}
          fill="none"
          stroke="rgba(127,127,127,0.35)"
          strokeWidth="3"
        />
        <G rotation={-90} originX={18} originY={18}>
          <Circle
            cx="18"
            cy="18"
            r={RING}
            fill="none"
            stroke="#0f6b5c"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${RING_C} ${RING_C}`}
            strokeDashoffset={RING_C * (1 - progress)}
          />
        </G>
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-foreground text-[11px] font-semibold tabular-nums">
          {padClock(seconds)}
        </Text>
      </View>
    </View>
  );
}

export function ClockTile({ config, size }: WidgetBodyProps) {
  const customTitle = readString(config, "title").trim();
  const setting = useLocaleStore((state) => state.ethiopianHours);
  const ethiopian =
    typeof config.ethiopian_hours === "boolean"
      ? config.ethiopian_hours
      : setting;
  const minHeight = useTileMinHeight(size);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      setNow(new Date());
      timeout = setTimeout(tick, CLOCK_TICK_MS);
    };
    tick();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const face = clockFace(now, ethiopian);

  return (
    <GlassSurface level="tile" className="flex-1 p-4" style={{ minHeight }}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-muted text-[11px] font-medium uppercase tracking-[0.16em]">
            {customTitle || face.weekday}
          </Text>
          <Text className="text-muted mt-0.5 text-sm">{face.date}</Text>
        </View>
        {face.periodLabel ? (
          <View className="bg-accent/15 rounded-full px-2 py-0.5">
            <Text className="text-accent text-xs font-medium">
              {face.periodLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-auto flex-row items-end justify-between gap-2 pt-3">
        <View>
          <Text className="text-foreground text-5xl font-semibold tabular-nums tracking-tighter">
            {padClock(face.hours)}
          </Text>
          <Text className="text-muted mt-1 text-2xl font-medium tabular-nums tracking-tight">
            {padClock(face.minutes)}
          </Text>
        </View>
        <SecondsFace progress={face.progress} seconds={face.seconds} />
      </View>

      {ethiopian ? (
        <Text className="text-muted mt-3 text-xs tabular-nums">
          {face.western}
        </Text>
      ) : null}
    </GlassSurface>
  );
}
