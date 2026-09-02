import { CloudSun } from "lucide-react";
import { z } from "zod";

import {
  compactTemperatureUnit,
  deriveWeather,
  joinFacts,
  weatherSparklinePath,
  WEATHER_SPARKLINE,
} from "@ethio/ha-sdk";
import {
  defineWidget,
  useEntity,
  useEntityDetail,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { cardShellClass, chipShellClass, cx, useCardDensity } from "../ui";
import { cardActivateProps } from "./card-activate";
import { ChipFace } from "./ChipFace";
import { friendlyName, widgetEntityId, widgetTitle } from "./names";
import { WidgetPlaceholder } from "./WidgetPlaceholder";

export const weatherConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

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
    <div className="mt-auto pt-3">
      <svg
        viewBox={`0 0 ${WEATHER_SPARKLINE.width} ${WEATHER_SPARKLINE.height}`}
        className="h-9 w-full text-sky-400"
        aria-hidden
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        {points.map((point, index) => (
          <span key={`${point.at.getTime()}-${point.temperature}`}>
            {formatHour(point.at, index)}
            {index === points.length - 1 ? ` ${point.temperature}${unit}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function WeatherWidget({ config, interactive }: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const entity = useEntity(entityId);
  const entityDetail = useEntityDetail();
  const { ref, compact, tight, chip } = useCardDensity();
  const weather = deriveWeather(entity);

  if (!entityId || !weather) {
    return (
      <WidgetPlaceholder
        title={customTitle || "Weather"}
        message={
          entityId ? "Entity unavailable" : "Pick a weather entity in settings."
        }
        dashed={Boolean(entityId)}
      />
    );
  }

  const displayTitle = customTitle || friendlyName(entity, "Weather");
  const unit = compactTemperatureUnit(weather.temperatureUnit);
  const condition = weather.state.replace(/-/g, " ");

  return (
    <div
      ref={ref}
      {...cardActivateProps(interactive, () => entityDetail.open(entityId))}
      className={cx(
        chip ? chipShellClass : cardShellClass,
        "border-border bg-card text-card-foreground outline-none",
        !chip && "border shadow-sm",
        !chip && (compact ? "p-4" : "p-5"),
        interactive
          ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          : "",
      )}
    >
      {chip ? (
        <ChipFace
          title={displayTitle}
          status={
            weather.temperature != null
              ? `${weather.temperature}${unit}`
              : condition
          }
          icon={CloudSun}
          active
        />
      ) : (
      <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Weather
          </p>
          <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight">
            {displayTitle}
          </h3>
        </div>
        <div className="rounded-full bg-sky-400/15 p-2 text-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.35)]">
          <CloudSun className="h-4 w-4" />
        </div>
      </div>
      <p
        className={cx(
          "mt-4 font-display font-semibold tracking-tight",
          compact ? "text-3xl" : "text-4xl",
        )}
      >
        {weather.temperature != null ? `${weather.temperature}${unit}` : "—"}
      </p>
      <p className="mt-1 text-sm capitalize text-muted-foreground">{condition}</p>
      {compact ? null : (
        <p className="mt-2 text-xs text-muted-foreground">
          {joinFacts([
            weather.apparent != null ? `Feels like ${weather.apparent}${unit}` : null,
            weather.humidity != null ? `${weather.humidity}%` : null,
            weather.windSpeed != null
              ? `${weather.windSpeed} ${weather.windUnit}`
              : null,
          ])}
        </p>
      )}
      {tight ? null : <WeatherSparkline points={weather.forecast} unit={unit} />}
      </>
      )}
    </div>
  );
}

export const weatherWidget = defineWidget({
  id: "@ethio/core/weather",
  name: "Weather",
  description: "Current condition, feels like, and a short forecast",
  component: WeatherWidget,
  configSchema: weatherConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 2, h: 2, minW: 2, minH: 1, maxW: 6, maxH: 5 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 6, h: 5 },
  entityDomains: ["weather"],
  capabilities: ["entity.read"],
});
