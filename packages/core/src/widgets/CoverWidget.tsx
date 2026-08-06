import { Blinds, ChevronDown, ChevronUp, Square } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import {
  defineWidget,
  useCallService,
  useEntity,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const coverConfigSchema = z.object({
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

function CoverWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const entity = useEntity(entityId);
  const callService = useCallService();
  const [pending, setPending] = useState(false);

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">Cover</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a cover entity in settings.
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

  const position =
    typeof entity.attributes.current_position === "number"
      ? entity.attributes.current_position
      : undefined;

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
    <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Cover
          </p>
          <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
            {getFriendlyName(entity)}
          </h3>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Blinds className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold capitalize tracking-tight">
        {entity.state}
      </p>
      {position != null ? (
        <p className="mt-1 text-sm text-muted-foreground">{position}% open</p>
      ) : null}
      {interactive ? (
        <div className="mt-auto flex gap-2 pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => void run("open_cover")}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted disabled:opacity-50"
            aria-label="Open cover"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void run("stop_cover")}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted disabled:opacity-50"
            aria-label="Stop cover"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void run("close_cover")}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 hover:bg-muted disabled:opacity-50"
            aria-label="Close cover"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export const coverWidget = defineWidget({
  id: "@ethio/core/cover",
  name: "Cover",
  description: "Open, close, or stop blinds and covers",
  component: CoverWidget,
  configSchema: coverConfigSchema,
  defaultConfig: { entity_id: "" },
  defaultSize: { w: 4, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 6 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["cover"],
  capabilities: ["entity.read", "service.call"],
});
