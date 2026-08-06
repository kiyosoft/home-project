import { CloudSun } from "lucide-react";
import { z } from "zod";

import {
  defineWidget,
  useEntity,
  useEntityDetail,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const weatherConfigSchema = z.object({
  entity_id: z.string().min(1, "Entity is required"),
});

function getFriendlyName(entity: {
  entity_id: string;
  attributes: Record<string, unknown>;
}): string {
  const name = entity.attributes.friendly_name;
  if (typeof name === "string" && name.trim()) return name;
  return entity.entity_id;
}

function WeatherWidget({ config, interactive }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const entity = useEntity(entityId);
  const entityDetail = useEntityDetail();

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">Weather</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a weather entity in settings.
        </p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">{entityId}</h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const temp =
    typeof entity.attributes.temperature === "number"
      ? entity.attributes.temperature
      : undefined;
  const unit =
    typeof entity.attributes.temperature_unit === "string"
      ? entity.attributes.temperature_unit
      : "°";
  const humidity =
    typeof entity.attributes.humidity === "number"
      ? entity.attributes.humidity
      : undefined;

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => entityDetail.open(entityId) : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                entityDetail.open(entityId);
              }
            }
          : undefined
      }
      className={`flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm outline-none transition-colors ${
        interactive
          ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Weather
          </p>
          <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
            {getFriendlyName(entity)}
          </h3>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <CloudSun className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
        {temp != null ? `${temp}${unit}` : "—"}
      </p>
      <p className="mt-1 text-sm capitalize text-muted-foreground">
        {entity.state.replace(/-/g, " ")}
        {humidity != null ? ` · ${humidity}% humidity` : ""}
      </p>
    </div>
  );
}

export const weatherWidget = defineWidget({
  id: "@ethio/core/weather",
  name: "Weather",
  description: "Current condition and temperature",
  component: WeatherWidget,
  configSchema: weatherConfigSchema,
  defaultConfig: { entity_id: "" },
  defaultSize: { w: 4, h: 3, minW: 3, minH: 2, maxW: 8, maxH: 5 },
  minSize: { w: 3, h: 2 },
  maxSize: { w: 8, h: 5 },
  entityDomains: ["weather"],
  capabilities: ["entity.read"],
});
