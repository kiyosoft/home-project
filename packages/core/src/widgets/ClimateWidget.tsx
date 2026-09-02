import { Minus, Plus, Thermometer } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { CLIMATE_STEP, deriveClimate, stepClimateTarget } from "@ethio/ha-sdk";
import {
  defineWidget,
  useCallService,
  useEntity,
  useEntityDetail,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { cardShellClass, chipShellClass, cx, useCardDensity } from "../ui";
import { cardActivateProps } from "./card-activate";
import { ChipFace } from "./ChipFace";
import { friendlyName, widgetEntityId, widgetTitle } from "./names";
import { WidgetPlaceholder } from "./WidgetPlaceholder";

export const climateConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function climateHeadline(climate: ReturnType<typeof deriveClimate>): string {
  if (climate.heating && climate.target != null) {
    return `Heating to ${climate.target}${climate.unit}`;
  }
  if (climate.cooling && climate.target != null) {
    return `Cooling to ${climate.target}${climate.unit}`;
  }
  return climate.hvac;
}

function ClimateWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const entity = useEntity(entityId);
  const callService = useCallService();
  const entityDetail = useEntityDetail();
  const { ref, compact, tight, chip } = useCardDensity();
  const [pending, setPending] = useState(false);

  if (!entityId || !entity) {
    return (
      <WidgetPlaceholder
        title={customTitle || entityId || "Climate"}
        message={
          entityId ? "Entity unavailable" : "Pick a climate entity in settings."
        }
        dashed={Boolean(entityId)}
      />
    );
  }

  const climate = deriveClimate(entity);
  const displayTitle = customTitle || friendlyName(entity, "Climate");

  async function adjust(delta: number) {
    if (!interactive || pending || climate.target == null) return;
    setPending(true);
    try {
      await callService("climate", "set_temperature", {
        entity_id: entityId,
        temperature: stepClimateTarget(climate.target, delta),
      });
    } finally {
      setPending(false);
    }
  }

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
            climate.current != null
              ? `${climate.current}${climate.unit}`
              : climateHeadline(climate)
          }
          icon={Thermometer}
          active={climate.heating || climate.cooling}
        />
      ) : (
      <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Climate
          </p>
          <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight">
            {displayTitle}
          </h3>
        </div>
        <div className={`rounded-full p-2 ${climate.heating ? "bg-orange-500/20 text-orange-400 shadow-[0_0_16px_rgba(251,146,60,0.45)]" : "bg-primary/10 text-primary"}`}>
          <Thermometer className="h-4 w-4" />
        </div>
      </div>
      {compact ? null : (
        <p className="mt-4 font-display text-xl font-semibold tracking-tight">
          {climateHeadline(climate)}
        </p>
      )}
      <p
        className={cx(
          "capitalize text-muted-foreground",
          compact ? "mt-2 font-display text-lg font-semibold tracking-tight text-card-foreground" : "mt-1 text-sm",
        )}
      >
        {compact
          ? climateHeadline(climate)
          : `${climate.current != null ? `${climate.current}${climate.unit}` : "—"}${
              climate.target != null && !climate.heating
                ? ` · set ${climate.target}${climate.unit}`
                : ""
            }`}
      </p>
      {interactive && climate.target != null && !tight ? (
        <div className="mt-auto flex gap-2 pt-4">
          <button
            type="button"
            disabled={pending}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void adjust(-CLIMATE_STEP);
            }}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted disabled:opacity-50"
            aria-label="Decrease temperature"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={pending}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void adjust(CLIMATE_STEP);
            }}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted disabled:opacity-50"
            aria-label="Increase temperature"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      </>
      )}
    </div>
  );
}

export const climateWidget = defineWidget({
  id: "@ethio/core/climate",
  name: "Climate",
  description: "Temperature and HVAC controls",
  component: ClimateWidget,
  configSchema: climateConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 4, h: 2, minW: 3, minH: 1, maxW: 8, maxH: 6 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["climate"],
  capabilities: ["entity.read", "service.call"],
});
