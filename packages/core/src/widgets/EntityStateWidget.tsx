import { Activity } from "lucide-react";
import { z } from "zod";

import {
  defineWidget,
  useEntity,
  useEntityDetail,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const entityStateConfigSchema = z.object({
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

function getUnit(entity: { attributes: Record<string, unknown> }): string | undefined {
  const unit = entity.attributes.unit_of_measurement;
  return typeof unit === "string" ? unit : undefined;
}

function EntityStateWidget({ config, interactive }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const entity = useEntity(entityId);
  const entityDetail = useEntityDetail();

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">No sensor found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a sensor entity in widget settings.
        </p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5 text-card-foreground">
        <h3 className="font-display text-base font-semibold">{entityId}</h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const unit = getUnit(entity);
  const isBinary = entity.entity_id.startsWith("binary_sensor.");
  const displayState = isBinary
    ? entity.state === "on"
      ? "Open / Detected"
      : "Clear"
    : entity.state;

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
      className={`flex h-full min-h-36 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm outline-none transition-colors ${
        interactive
          ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Sensor
          </p>
          <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
            {getFriendlyName(entity)}
          </h3>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Activity className="h-4 w-4" />
        </div>
      </div>
      <p
        className={`mt-4 font-display text-3xl font-semibold tracking-tight ${
          entity.state === "unavailable" ? "text-muted-foreground" : ""
        }`}
      >
        {displayState}
        {unit ? (
          <span className="ml-1 text-lg font-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </p>
      <p className="mt-2 truncate text-xs text-muted-foreground">
        {entity.entity_id}
      </p>
    </div>
  );
}

export const entityStateWidget = defineWidget({
  id: "@ethio/core/entity-state",
  name: "Entity State",
  description: "Show a sensor or binary sensor value",
  component: EntityStateWidget,
  configSchema: entityStateConfigSchema,
  defaultConfig: { entity_id: "" },
  defaultSize: { w: 4, h: 3, minW: 2, minH: 2, maxW: 12, maxH: 6 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 6 },
  entityDomains: ["sensor", "binary_sensor"],
  capabilities: ["entity.read"],
});
