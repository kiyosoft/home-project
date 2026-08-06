import { Lightbulb, Power } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import {
  defineWidget,
  useCallService,
  useEntity,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const toggleConfigSchema = z.object({
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

function domainFromEntityId(entityId: string): string {
  return entityId.split(".")[0] ?? "";
}

function ToggleWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const entity = useEntity(entityId);
  const callService = useCallService();
  const [pending, setPending] = useState(false);

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">
          No toggle entity found
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a light, switch, or input boolean in settings.
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

  const domain = domainFromEntityId(entity.entity_id);
  const isOn = entity.state === "on";
  const Icon = domain === "light" ? Lightbulb : Power;
  const toggleEntityId = entity.entity_id;

  async function handleToggle() {
    if (pending) return;
    setPending(true);
    try {
      await callService(domain, "toggle", { entity_id: toggleEntityId });
    } finally {
      setPending(false);
    }
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {domain}
          </p>
          <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
            {getFriendlyName(entity)}
          </h3>
        </div>
        <div
          className={`rounded-full p-2 ${
            isOn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
        {isOn ? "On" : "Off"}
      </p>
      <p className="mt-2 truncate text-xs text-muted-foreground">
        {interactive ? `Tap to toggle · ${entity.entity_id}` : entity.entity_id}
      </p>
    </>
  );

  const cardClass = `flex h-full min-h-36 flex-col rounded-2xl border p-5 shadow-sm ${
    isOn
      ? "border-primary/40 bg-primary/10 text-card-foreground"
      : "border-border bg-card text-card-foreground"
  }`;

  if (!interactive) {
    return <div className={cardClass}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleToggle();
      }}
      disabled={pending || entity.state === "unavailable"}
      className={`${cardClass} w-full text-left transition-colors hover:border-primary/30 disabled:opacity-60`}
    >
      {body}
    </button>
  );
}

export const toggleWidget = defineWidget({
  id: "@ethio/core/toggle",
  name: "Toggle",
  description: "Toggle a light, switch, or input boolean",
  component: ToggleWidget,
  configSchema: toggleConfigSchema,
  defaultConfig: { entity_id: "" },
  defaultSize: { w: 4, h: 3, minW: 2, minH: 2, maxW: 8, maxH: 6 },
  minSize: { w: 2, h: 2 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["light", "switch", "input_boolean"],
  capabilities: ["entity.read", "service.call"],
});
