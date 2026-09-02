import { Activity } from "lucide-react";
import { z } from "zod";

import { boundEntityIds, formatAllOrFraction, isDetectedState, stringAttr, tallyEntities } from "@ethio/ha-sdk";
import {
  defineWidget,
  useEntities,
  useEntity,
  useEntityDetail,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { cardShellClass, chipShellClass, cx, useCardDensity } from "../ui";
import { cardActivateProps } from "./card-activate";
import { ChipFace } from "./ChipFace";
import { friendlyName, widgetEntityId, widgetTitle } from "./names";
import { WidgetPlaceholder } from "./WidgetPlaceholder";

export const entityStateConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function EntityStateWidget({ config, interactive }: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const entity = useEntity(entityId);
  const entities = useEntities();
  const entityDetail = useEntityDetail();
  const { ref, compact, tight, chip } = useCardDensity();

  if (!entityId || !entity) {
    return (
      <WidgetPlaceholder
        title={customTitle || entityId || "No sensor found"}
        message={
          entityId
            ? "Entity unavailable"
            : "Pick a sensor entity in widget settings."
        }
        dashed={Boolean(entityId)}
      />
    );
  }

  const unit = stringAttr(entity.attributes, "unit_of_measurement");
  const displayTitle = customTitle || friendlyName(entity, "Sensor");
  const isBinary = entity.entity_id.startsWith("binary_sensor.");
  const members = boundEntityIds({ entity_id: entityId }, entity);
  const tally = tallyEntities(entities, members, isDetectedState);
  const displayState = isBinary
    ? members.length > 1
      ? formatAllOrFraction(tally.active, tally.total, {
          all: "All on",
          none: "All off",
          word: "on",
        })
      : entity.state === "on"
        ? "Open / Detected"
        : "Clear"
    : entity.state;

  return (
    <div
      ref={ref}
      {...cardActivateProps(interactive, () => entityDetail.open(entityId))}
      className={cx(
        chip ? chipShellClass : cardShellClass,
        "border-border bg-card text-card-foreground outline-none transition-colors",
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
          status={unit ? `${displayState} ${unit}` : displayState}
          icon={Activity}
          active={entity.state !== "unavailable" && entity.state !== "off"}
        />
      ) : (
      <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Sensor
          </p>
          <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight">
            {displayTitle}
          </h3>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Activity className="h-4 w-4" />
        </div>
      </div>
      <p
        className={cx(
          "mt-4 font-display font-semibold tracking-tight",
          compact ? "text-xl" : "text-3xl",
          entity.state === "unavailable" ? "text-muted-foreground" : "",
        )}
      >
        {displayState}
        {unit ? (
          <span className="ml-1 text-lg font-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </p>
      {tight ? null : (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {entity.entity_id}
        </p>
      )}
      </>
      )}
    </div>
  );
}

export const entityStateWidget = defineWidget({
  id: "@ethio/core/entity-state",
  name: "Entity State",
  description: "Show a sensor or binary sensor value",
  component: EntityStateWidget,
  configSchema: entityStateConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 4, h: 1, minW: 2, minH: 1, maxW: 12, maxH: 6 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 12, h: 6 },
  entityDomains: ["sensor", "binary_sensor"],
  capabilities: ["entity.read"],
});
