import { Lightbulb, Power } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { boundEntityIds, entityDomain, formatFraction, isOnState, tallyEntities } from "@ethio/ha-sdk";
import {
  defineWidget,
  useCallService,
  useEntities,
  useEntity,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { Switch, cardShellClass, chipShellClass, cx, useCardDensity } from "../ui";
import { ChipFace } from "./ChipFace";
import { friendlyName, widgetEntityId, widgetTitle } from "./names";
import { WidgetPlaceholder } from "./WidgetPlaceholder";

export const toggleConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function toggleStatus(
  members: string[],
  tally: { active: number; total: number },
  state: string,
): { isOn: boolean; status: string } {
  const grouped = members.length > 1;
  const isOn = grouped ? tally.active > 0 : state === "on";
  return {
    isOn,
    status: grouped
      ? formatFraction(tally.active, tally.total, "on")
      : isOn
        ? "On"
        : "Off",
  };
}

function ToggleWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const entity = useEntity(entityId);
  const entities = useEntities();
  const callService = useCallService();
  const { ref, compact, tight, chip } = useCardDensity<HTMLElement>();
  const [pending, setPending] = useState(false);

  if (!entityId || !entity) {
    return (
      <WidgetPlaceholder
        title={customTitle || entityId || "No toggle entity found"}
        message={
          entityId
            ? "Entity unavailable"
            : "Pick a light, switch, or input boolean in settings."
        }
        dashed={Boolean(entityId)}
      />
    );
  }

  const domain = entityDomain(entity.entity_id);
  const displayTitle = customTitle || friendlyName(entity, "Toggle");
  const members = boundEntityIds({ entity_id: entityId }, entity);
  const tally = tallyEntities(entities, members, isOnState);
  const { isOn, status } = toggleStatus(members, tally, entity.state);
  const Icon = domain === "light" ? Lightbulb : Power;

  async function handleToggle() {
    if (pending) return;
    setPending(true);
    try {
      await callService(domain, "toggle", { entity_id: entityId });
    } finally {
      setPending(false);
    }
  }

  const body = chip ? (
    <ChipFace
      title={displayTitle}
      status={status}
      icon={Icon}
      active={isOn}
    />
  ) : (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {domain}
          </p>
          <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
            {displayTitle}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Icon
            className={`h-4 w-4 ${isOn ? "text-primary" : "text-muted-foreground"}`}
          />
          {interactive ? (
            <Switch
              presentational
              checked={isOn}
              label={displayTitle}
              size="sm"
            />
          ) : null}
        </div>
      </div>
      {compact ? null : (
        <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
          {status}
        </p>
      )}
      {tight ? null : (
        <p className={cx("truncate text-xs text-muted-foreground", compact ? "mt-auto" : "mt-2")}>
          {compact
            ? status
            : interactive
              ? `Tap to toggle · ${entity.entity_id}`
              : entity.entity_id}
        </p>
      )}
    </>
  );

  const cardClass = cx(
    chip ? chipShellClass : cardShellClass,
    !chip && "border shadow-sm",
    !chip && (compact ? "p-4" : "p-5"),
    isOn
      ? "border-primary/30 bg-primary/15 text-card-foreground"
      : "border-border bg-card text-card-foreground",
  );

  return interactive ? (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={() => {
        void handleToggle();
      }}
      disabled={pending || entity.state === "unavailable"}
      className={`${cardClass} text-left transition-colors hover:border-primary/30 disabled:opacity-60`}
    >
      {body}
    </button>
  ) : (
    <div ref={ref} className={cardClass}>
      {body}
    </div>
  );
}

export const toggleWidget = defineWidget({
  id: "@ethio/core/toggle",
  name: "Toggle",
  description: "Toggle a light, switch, or input boolean",
  component: ToggleWidget,
  configSchema: toggleConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 4, h: 1, minW: 2, minH: 1, maxW: 8, maxH: 6 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["switch", "input_boolean"],
  capabilities: ["entity.read", "service.call"],
});
