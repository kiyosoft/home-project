import { Minus, Plus, Thermometer } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import {
  defineWidget,
  useCallService,
  useEntity,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const climateConfigSchema = z.object({
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

function numAttr(
  attrs: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = attrs[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function ClimateWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const entity = useEntity(entityId);
  const callService = useCallService();
  const [pending, setPending] = useState(false);

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">Climate</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a climate entity in settings.
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

  const current = numAttr(entity.attributes, "current_temperature");
  const target = numAttr(entity.attributes, "temperature");
  const unit =
    typeof entity.attributes.temperature_unit === "string"
      ? entity.attributes.temperature_unit
      : "°";
  const hvac =
    typeof entity.attributes.hvac_action === "string"
      ? entity.attributes.hvac_action
      : entity.state;

  async function adjust(delta: number) {
    if (!interactive || pending || target == null) return;
    setPending(true);
    try {
      await callService("climate", "set_temperature", {
        entity_id: entityId,
        temperature: target + delta,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Climate
          </p>
          <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
            {getFriendlyName(entity)}
          </h3>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Thermometer className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
        {current != null ? `${current}${unit}` : "—"}
      </p>
      <p className="mt-1 text-sm capitalize text-muted-foreground">
        {hvac}
        {target != null ? ` · set ${target}${unit}` : ""}
      </p>
      {interactive && target != null ? (
        <div className="mt-auto flex gap-2 pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => void adjust(-0.5)}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted disabled:opacity-50"
            aria-label="Decrease temperature"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void adjust(0.5)}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted disabled:opacity-50"
            aria-label="Increase temperature"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export const climateWidget = defineWidget({
  id: "@ethio/core/climate",
  name: "Climate",
  description: "Temperature and HVAC controls",
  component: ClimateWidget,
  configSchema: climateConfigSchema,
  defaultConfig: { entity_id: "" },
  defaultSize: { w: 4, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 6 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["climate"],
  capabilities: ["entity.read", "service.call"],
});
