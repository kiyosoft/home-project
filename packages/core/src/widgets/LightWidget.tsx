import { Lightbulb } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { z } from "zod";

import {
  defineWidget,
  PluginScope,
  useDetailModal,
  useLight,
  usePluginId,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { LightDetailBody } from "./light/LightDetailBody";

export const lightConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

function LightWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle =
    typeof config.title === "string" ? config.title.trim() : "";
  const light = useLight(entityId);
  const detailModal = useDetailModal();
  const pluginId = usePluginId();
  const [pending, setPending] = useState(false);

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">
          {customTitle || "Light"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a light entity in settings.
        </p>
      </div>
    );
  }

  if (!light) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">
          {customTitle || entityId}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const displayTitle =
    customTitle ||
    (typeof light.attributes.friendly_name === "string"
      ? light.attributes.friendly_name
      : light.entityId);

  async function run(action: () => Promise<void>) {
    if (!interactive || pending) return;
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  function openDetail() {
    if (!interactive || !pluginId) return;
    detailModal.open({
      title: displayTitle,
      description: "Light controls",
      className: "max-w-md",
      body: (
        <PluginScope pluginId={pluginId}>
          <LightDetailBody entityId={entityId} />
        </PluginScope>
      ),
    });
  }

  const cardClass = `flex h-full min-h-36 w-full flex-col rounded-2xl border p-5 text-left shadow-sm transition-colors ${
    light.isOn
      ? "border-primary/40 bg-primary/10 text-card-foreground"
      : "border-border bg-card text-card-foreground"
  } ${interactive ? "hover:border-primary/30" : ""}`;

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? openDetail : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
              }
            }
          : undefined
      }
      className={cardClass}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Light
          </p>
          <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
            {displayTitle}
          </h3>
        </div>
        <button
          type="button"
          disabled={!interactive || pending}
          onClick={(event) => {
            stopPropagation(event);
            void run(() => light.toggle());
          }}
          className={`rounded-full p-2 transition-colors disabled:opacity-60 ${
            light.isOn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          aria-label={light.isOn ? "Turn off" : "Turn on"}
        >
          <Lightbulb className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
        {light.isOn ? "On" : "Off"}
      </p>
      {light.isOn && light.supportsBrightness ? (
        <div
          className="mt-auto pt-4"
          onClick={stopPropagation}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Brightness</span>
            <span>{light.brightnessPercent}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={Math.max(1, light.brightnessPercent)}
            disabled={!interactive || pending}
            onChange={(event) => {
              const value = Number(event.target.value);
              void run(() => light.setBrightnessPercent(value));
            }}
            className="w-full accent-primary"
            aria-label="Brightness"
          />
        </div>
      ) : (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {interactive ? "Tap for details" : light.entityId}
        </p>
      )}
    </div>
  );
}

export const lightWidget = defineWidget({
  id: "@ethio/core/light",
  name: "Light",
  description: "Control lights with brightness, color, and effects",
  component: LightWidget,
  configSchema: lightConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 4, h: 4, minW: 2, minH: 3, maxW: 8, maxH: 6 },
  minSize: { w: 2, h: 3 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["light"],
  capabilities: ["entity.read", "service.call"],
});
