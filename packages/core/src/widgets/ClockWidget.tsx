import { useEffect, useId, useMemo, useState } from "react";
import { z } from "zod";

import {
  analogHands,
  CLOCK_TICK_MS,
  clockFace,
  padClock,
  type ClockFace,
} from "@ethio/ha-sdk";
import { defineWidget, type WidgetComponentProps } from "@ethio/plugin-sdk";

import { Clock } from "lucide-react";

import { cardShellClass, chipShellClass, cx, useCardDensity } from "../ui";
import { ChipFace } from "./ChipFace";
import { widgetTitle } from "./names";

export const CLOCK_TYPES = ["analog", "digital"] as const;
export type ClockType = (typeof CLOCK_TYPES)[number];

export function readClockType(config: Record<string, unknown>): ClockType {
  return config.clock_type === "digital" ? "digital" : "analog";
}

export const clockConfigSchema = z.object({
  title: z.string().default(""),
  clock_type: z.enum(["analog", "digital"]).default("analog"),
  ethiopian_hours: z.boolean().default(false),
});

function polar(cx: number, cy: number, radius: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius };
}

function Hand({
  cx,
  cy,
  deg,
  length,
  tail = 0,
  width,
  className,
  filter,
}: {
  cx: number;
  cy: number;
  deg: number;
  length: number;
  tail?: number;
  width: number;
  className: string;
  filter?: string;
}) {
  const tip = polar(cx, cy, length, deg);
  const back = polar(cx, cy, tail, deg + 180);
  return (
    <line
      x1={back.x}
      y1={back.y}
      x2={tip.x}
      y2={tip.y}
      className={className}
      strokeWidth={width}
      strokeLinecap="round"
      filter={filter}
    />
  );
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
  const reactId = useId().replace(/:/g, "");
  const glowId = `ethio-second-glow-${reactId}`;
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

  const tip = polar(cx, cy, r * 0.74, hands.secondDeg);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 z-10 h-full w-full"
      aria-hidden
    >
      <defs>
        <filter
          id={glowId}
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.15" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {ticks.map((tick) => (
        <line
          key={tick.i}
          x1={tick.a.x}
          y1={tick.a.y}
          x2={tick.b.x}
          y2={tick.b.y}
          className={tick.hour ? "stroke-foreground/55" : "stroke-foreground/18"}
          strokeWidth={tick.hour ? 2.4 : 1}
          strokeLinecap="round"
        />
      ))}
      <Hand
        cx={cx}
        cy={cy}
        deg={hands.hourDeg}
        length={r * 0.42}
        tail={r * 0.08}
        width={Math.max(3.2, r * 0.028)}
        className="stroke-foreground"
      />
      <Hand
        cx={cx}
        cy={cy}
        deg={hands.minuteDeg}
        length={r * 0.62}
        tail={r * 0.1}
        width={Math.max(2, r * 0.016)}
        className="stroke-foreground"
      />
      <Hand
        cx={cx}
        cy={cy}
        deg={hands.secondDeg}
        length={r * 0.74}
        tail={r * 0.16}
        width={1.35}
        className="stroke-primary"
        filter={`url(#${glowId})`}
      />
      <circle
        cx={tip.x}
        cy={tip.y}
        r={Math.max(2.4, r * 0.018)}
        className="fill-primary"
        filter={`url(#${glowId})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(3.5, r * 0.028)}
        className="fill-foreground"
      />
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(1.6, r * 0.012)}
        className="fill-primary"
      />
    </svg>
  );
}

function AnalogFace({
  width,
  height,
  now,
  ethiopian,
  tight,
  label,
}: {
  width: number;
  height: number;
  now: Date;
  ethiopian: boolean;
  tight: boolean;
  label: string;
}) {
  const type = Math.round(
    Math.min(128, Math.max(tight ? 40 : 52, Math.min(width, height) * 0.48)),
  );
  const ready = width > 8 && height > 8;

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 46%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 64%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 grid place-items-center overflow-hidden"
        aria-hidden
      >
        <p
          className="select-none font-display font-medium tabular-nums tracking-tighter"
          style={{
            fontSize: type,
            lineHeight: 1,
            color:
              "color-mix(in oklab, var(--muted-foreground) 70%, transparent)",
            filter: `blur(${Math.max(8, type * 0.16)}px)`,
            transform: "scale(1.12) translateZ(0)",
          }}
        >
          {label}
        </p>
      </div>
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

function SecondsFace({
  progress,
  seconds,
}: {
  progress: number;
  seconds: number;
}) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-14 w-14 shrink-0" aria-hidden>
      <svg viewBox="0 0 36 36" className="h-full w-full">
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums text-foreground">
        {padClock(seconds)}
      </span>
    </div>
  );
}

function DigitalFace({
  face,
  customTitle,
  compact,
  tight,
  ethiopian,
}: {
  face: ClockFace;
  customTitle: string;
  compact: boolean;
  tight: boolean;
  ethiopian: boolean;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {customTitle || face.weekday}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{face.date}</p>
        </div>
        {face.periodLabel ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {face.periodLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <div className="leading-none">
          <p
            className={cx(
              "font-display font-semibold tabular-nums tracking-tighter",
              compact ? "text-4xl" : "text-5xl sm:text-6xl",
            )}
          >
            {padClock(face.hours)}
          </p>
          <p
            className={cx(
              "mt-1 font-medium tabular-nums tracking-tight text-muted-foreground",
              compact ? "text-xl" : "text-2xl sm:text-3xl",
            )}
          >
            {padClock(face.minutes)}
          </p>
        </div>
        {tight ? null : (
          <SecondsFace progress={face.progress} seconds={face.seconds} />
        )}
      </div>

      {ethiopian && !tight ? (
        <p className="mt-3 text-xs tabular-nums text-muted-foreground">
          {face.western}
        </p>
      ) : null}
    </>
  );
}

function ClockWidget({ config }: WidgetComponentProps) {
  const customTitle = widgetTitle(config);
  const clockType = readClockType(config);
  const ethiopian = config.ethiopian_hours === true;
  const { ref, size, compact, tight, chip } = useCardDensity();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeout = 0;
    const tick = () => {
      setNow(new Date());
      timeout = window.setTimeout(tick, CLOCK_TICK_MS);
    };
    tick();
    return () => window.clearTimeout(timeout);
  }, []);

  const face = clockFace(now, ethiopian);
  const analog = clockType === "analog";
  const label = `${padClock(face.hours)}:${padClock(face.minutes)}`;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${label}, ${face.weekday} ${face.date}`}
      className={cx(
        chip ? chipShellClass : cardShellClass,
        "border-border bg-card text-card-foreground",
        !chip && "relative border shadow-sm",
        !chip && !analog && "p-4",
      )}
    >
      {chip ? (
        <ChipFace
          title={customTitle || face.weekday}
          status={label}
          icon={Clock}
          active
        />
      ) : analog ? (
        <AnalogFace
          width={size.width}
          height={size.height}
          now={now}
          ethiopian={ethiopian}
          tight={tight}
          label={label}
        />
      ) : (
        <DigitalFace
          face={face}
          customTitle={customTitle}
          compact={compact}
          tight={tight}
          ethiopian={ethiopian}
        />
      )}
    </div>
  );
}

export const clockWidget = defineWidget({
  id: "@ethio/core/clock",
  name: "Clock",
  description: "Live time, weekday, and date",
  component: ClockWidget,
  configSchema: clockConfigSchema,
  defaultConfig: { title: "", clock_type: "analog", ethiopian_hours: false },
  defaultSize: { w: 2, h: 2, minW: 2, minH: 1, maxW: 6, maxH: 5 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 6, h: 5 },
  capabilities: ["entity.read"],
});
