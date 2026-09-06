import {
  analogHands,
  CLOCK_TICK_MS,
  clockFace,
  padClock,
  type ClockFace,
} from "@ethio/ha-sdk";
import { Text } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line } from "react-native-svg";

import { useLocaleStore } from "@/store/locale-store";
import { GlassSurface } from "@/ui/GlassSurface";
import { useTileMinHeight } from "@/widgets/tile-metrics";
import { readString, type WidgetBodyProps } from "@/widgets/types";

const ACCENT = "#0f6b5c";
const HAND = "#1c1916";

function polar(cx: number, cy: number, radius: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius };
}

function ClockDial({
  width,
  height,
  now,
  ethiopian,
}: {
  width: number;
  height: number;
  now: Date;
  ethiopian: boolean;
}) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.hypot(width, height) / 2;
  const hands = analogHands(now, ethiopian);
  const ticks = useMemo(() => {
    const hourInner = r * 0.78;
    const minuteInner = r * 0.9;
    const outer = r * 1.02;
    return Array.from({ length: 60 }, (_, i) => {
      const deg = i * 6;
      const hour = i % 5 === 0;
      const inner = hour ? hourInner : minuteInner;
      return {
        i,
        hour,
        a: polar(cx, cy, inner, deg),
        b: polar(cx, cy, outer, deg),
      };
    });
  }, [cx, cy, r]);

  const hourTip = polar(cx, cy, r * 0.42, hands.hourDeg);
  const hourTail = polar(cx, cy, r * 0.08, hands.hourDeg + 180);
  const minuteTip = polar(cx, cy, r * 0.62, hands.minuteDeg);
  const minuteTail = polar(cx, cy, r * 0.1, hands.minuteDeg + 180);
  const secondTip = polar(cx, cy, r * 0.74, hands.secondDeg);
  const secondTail = polar(cx, cy, r * 0.16, hands.secondDeg + 180);

  return (
    <Svg
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
      viewBox={`0 0 ${width} ${height}`}
    >
      {ticks.map((tick) => (
        <Line
          key={tick.i}
          x1={tick.a.x}
          y1={tick.a.y}
          x2={tick.b.x}
          y2={tick.b.y}
          stroke={tick.hour ? "rgba(28,25,22,0.55)" : "rgba(28,25,22,0.18)"}
          strokeWidth={tick.hour ? 2.4 : 1}
          strokeLinecap="round"
        />
      ))}
      <Line
        x1={hourTail.x}
        y1={hourTail.y}
        x2={hourTip.x}
        y2={hourTip.y}
        stroke={HAND}
        strokeWidth={Math.max(3.2, r * 0.028)}
        strokeLinecap="round"
      />
      <Line
        x1={minuteTail.x}
        y1={minuteTail.y}
        x2={minuteTip.x}
        y2={minuteTip.y}
        stroke={HAND}
        strokeWidth={Math.max(2, r * 0.016)}
        strokeLinecap="round"
      />
      <Line
        x1={secondTail.x}
        y1={secondTail.y}
        x2={secondTip.x}
        y2={secondTip.y}
        stroke={ACCENT}
        strokeWidth="5"
        strokeLinecap="round"
        opacity={0.18}
      />
      <Line
        x1={secondTail.x}
        y1={secondTail.y}
        x2={secondTip.x}
        y2={secondTip.y}
        stroke={ACCENT}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <Circle cx={secondTip.x} cy={secondTip.y} r={Math.max(2.4, r * 0.018)} fill={ACCENT} />
      <Circle cx={cx} cy={cy} r={Math.max(3.5, r * 0.028)} fill={HAND} />
      <Circle cx={cx} cy={cy} r={Math.max(1.6, r * 0.012)} fill={ACCENT} />
    </Svg>
  );
}

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

function AnalogFace({
  width,
  height,
  now,
  ethiopian,
  compact,
  label,
}: {
  width: number;
  height: number;
  now: Date;
  ethiopian: boolean;
  compact: boolean;
  label: string;
}) {
  const ready = width > 8 && height > 8;
  return (
    <>
      <View
        pointerEvents="none"
        className="absolute inset-0 z-0 items-center justify-center overflow-hidden px-2"
        style={{ opacity: 0.14 }}
      >
        <Text
          className={`text-muted font-medium tabular-nums tracking-tighter ${
            compact ? "text-6xl" : "text-8xl"
          }`}
          style={{
            transform: [{ scale: 1.12 }],
            textShadowColor: "rgba(28,25,22,0.12)",
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 14,
          }}
        >
          {label}
        </Text>
      </View>
      {ready ? (
        <ClockDial
          width={width}
          height={height}
          now={now}
          ethiopian={ethiopian}
        />
      ) : null}
    </>
  );
}

function DigitalFace({
  face,
  customTitle,
  ethiopian,
}: {
  face: ClockFace;
  customTitle: string;
  ethiopian: boolean;
}) {
  return (
    <>
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
    </>
  );
}

export function ClockTile({ config, size }: WidgetBodyProps) {
  const customTitle = readString(config, "title").trim();
  const analog = config.clock_type !== "digital";
  const setting = useLocaleStore((state) => state.ethiopianHours);
  const ethiopian =
    typeof config.ethiopian_hours === "boolean"
      ? config.ethiopian_hours
      : setting;
  const minHeight = useTileMinHeight(size);
  const [now, setNow] = useState(() => new Date());
  const [box, setBox] = useState({ width: 0, height: 0 });

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
  const compact = size === "sm";
  const label = `${padClock(face.hours)}:${padClock(face.minutes)}`;

  return (
    <GlassSurface
      level="tile"
      className={analog ? "flex-1 overflow-hidden p-0" : "flex-1 overflow-hidden p-4"}
      style={{ minHeight }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((prev) =>
          prev.width === width && prev.height === height
            ? prev
            : { width, height },
        );
      }}
    >
      {analog ? (
        <AnalogFace
          width={box.width}
          height={box.height}
          now={now}
          ethiopian={ethiopian}
          compact={compact}
          label={label}
        />
      ) : (
        <DigitalFace
          face={face}
          customTitle={customTitle}
          ethiopian={ethiopian}
        />
      )}
    </GlassSurface>
  );
}
