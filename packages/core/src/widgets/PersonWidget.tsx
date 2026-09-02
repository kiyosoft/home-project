import { User } from "lucide-react";
import { z } from "zod";

import {
  defineWidget,
  useEntity,
  useEntityDetail,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const personConfigSchema = z.object({
  title: z.string().default(""),
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

function PersonWidget({ config, interactive }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle = typeof config.title === "string" ? config.title.trim() : "";
  const entity = useEntity(entityId);
  const entityDetail = useEntityDetail();

  if (!entityId) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">
          {customTitle || "Person"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a person entity in settings.
        </p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">
          {customTitle || entityId}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const displayTitle = customTitle || getFriendlyName(entity);
  const picture =
    typeof entity.attributes.entity_picture === "string"
      ? entity.attributes.entity_picture
      : undefined;
  const home = entity.state === "home";

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
      className={`flex h-full min-h-0 flex-col overflow-hidden items-center justify-center rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm outline-none transition-colors ${
        interactive
          ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          : ""
      }`}
    >
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted">
          {picture ? (
            <img
              src={picture}
              alt={displayTitle}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <span
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card ${
            home ? "bg-success" : "bg-muted-foreground"
          }`}
          aria-hidden
        />
      </div>
      <h3 className="mt-3 font-display text-base font-semibold tracking-tight">
        {displayTitle}
      </h3>
      <p className="mt-1 text-sm capitalize text-muted-foreground">
        {entity.state}
      </p>
    </div>
  );
}

export const personWidget = defineWidget({
  id: "@ethio/core/person",
  name: "Person",
  description: "Presence and person status",
  component: PersonWidget,
  configSchema: personConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 3, h: 3, minW: 2, minH: 3, maxW: 6, maxH: 5 },
  minSize: { w: 2, h: 3 },
  maxSize: { w: 6, h: 5 },
  entityDomains: ["person", "device_tracker"],
  capabilities: ["entity.read"],
});
