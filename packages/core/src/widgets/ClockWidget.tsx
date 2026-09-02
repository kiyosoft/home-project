import { useEffect, useState } from "react";
import { z } from "zod";

import {
  CLOCK_TICK_MS,
  clockFace,
  padClock,
} from "@ethio/ha-sdk";
import { defineWidget, type WidgetComponentProps } from "@ethio/plugin-sdk";

import { Clock } from "lucide-react";

import { cardShellClass, chipShellClass, cx, useCardDensity } from "../ui";
import { ChipFace } from "./ChipFace";
import { widgetTitle } from "./names";

export const clockConfigSchema = z.object({
  title: z.string().default(""),
  ethiopian_hours: z.boolean().default(false),
});

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

function ClockWidget({ config }: WidgetComponentProps) {
  const customTitle = widgetTitle(config);
  const ethiopian = config.ethiopian_hours === true;
  const { ref, compact, tight, chip } = useCardDensity();
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

  return (
    <div
      ref={ref}
      className={cx(
        chip ? chipShellClass : cardShellClass,
        "border-border bg-card text-card-foreground",
        !chip && "border p-4 shadow-sm",
      )}
    >
      {chip ? (
        <ChipFace
          title={customTitle || face.weekday}
          status={`${padClock(face.hours)}:${padClock(face.minutes)}`}
          icon={Clock}
          active
        />
      ) : (
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
  defaultConfig: { title: "", ethiopian_hours: false },
  defaultSize: { w: 2, h: 2, minW: 2, minH: 1, maxW: 6, maxH: 5 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 6, h: 5 },
  capabilities: ["entity.read"],
});
