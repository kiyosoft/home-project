import { Blinds, ChevronDown, ChevronUp, Square } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import {
  boundEntityIds,
  formatFraction,
  isOpenState,
  numericAttr,
  tallyEntities,
} from "@ethio/ha-sdk";
import {
  defineWidget,
  useCallService,
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

export const coverConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function CoverWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const entity = useEntity(entityId);
  const entities = useEntities();
  const callService = useCallService();
  const entityDetail = useEntityDetail();
  const { ref, compact, tight, chip } = useCardDensity();
  const [pending, setPending] = useState(false);

  if (!entityId || !entity) {
    return (
      <WidgetPlaceholder
        title={customTitle || entityId || "Cover"}
        message={
          entityId ? "Entity unavailable" : "Pick a cover entity in settings."
        }
        dashed={Boolean(entityId)}
      />
    );
  }

  const displayTitle = customTitle || friendlyName(entity, "Cover");
  const members = boundEntityIds({ entity_id: entityId }, entity);
  const tally = tallyEntities(entities, members, isOpenState);
  const groupStatus =
    members.length > 1
      ? formatFraction(tally.active, tally.total, "open")
      : entity.state;
  const position = numericAttr(entity.attributes, "current_position");

  async function run(service: "open_cover" | "close_cover" | "stop_cover") {
    if (!interactive || pending) return;
    setPending(true);
    try {
      await callService("cover", service, { entity_id: entityId });
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
            position != null ? `${Math.round(position)}%` : String(groupStatus)
          }
          icon={Blinds}
          active={tally.active > 0}
        />
      ) : (
      <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Cover
          </p>
          <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight">
            {displayTitle}
          </h3>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Blinds className="h-4 w-4" />
        </div>
      </div>
      <p
        className={cx(
          "mt-4 font-display font-semibold capitalize tracking-tight",
          compact ? "text-xl" : "text-3xl",
        )}
      >
        {groupStatus}
      </p>
      {position != null && !tight ? (
        <p className="mt-1 text-sm text-muted-foreground">{position}% open</p>
      ) : null}
      {interactive && !tight ? (
        <div className="mt-auto flex gap-2 pt-4">
          <button
            type="button"
            disabled={pending}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void run("open_cover");
            }}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted disabled:opacity-50"
            aria-label="Open cover"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={pending}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void run("stop_cover");
            }}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted disabled:opacity-50"
            aria-label="Stop cover"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={pending}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void run("close_cover");
            }}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted disabled:opacity-50"
            aria-label="Close cover"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      </>
      )}
    </div>
  );
}

export const coverWidget = defineWidget({
  id: "@ethio/core/cover",
  name: "Cover",
  description: "Open, close, or stop blinds and covers",
  component: CoverWidget,
  configSchema: coverConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 4, h: 1, minW: 2, minH: 1, maxW: 8, maxH: 6 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["cover"],
  capabilities: ["entity.read", "service.call"],
});
