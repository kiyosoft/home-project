import { Fan } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { numericAttr } from "@ethio/ha-sdk";
import {
  defineWidget,
  useCallService,
  useEntity,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { Slider } from "../ui";
import { friendlyName, widgetEntityId, widgetTitle } from "./names";
import { StatusTile } from "./StatusTile";

export const fanConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function FanWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const entity = useEntity(entityId);
  const callService = useCallService();
  const [pending, setPending] = useState(false);

  if (!entityId || !entity) {
    return (
      <StatusTile
        kicker="Fan"
        title={customTitle || "Fan"}
        status={entityId ? "Unavailable" : "Pick a fan"}
        icon={Fan}
      />
    );
  }

  const isOn = entity.state === "on";
  const percentage = numericAttr(entity.attributes, "percentage") ?? 0;
  const title = customTitle || friendlyName(entity, "Fan");
  const status = isOn ? `On - ${Math.round(percentage)}%` : "Off";

  async function toggle() {
    if (!interactive || pending) return;
    setPending(true);
    try {
      await callService("fan", isOn ? "turn_off" : "turn_on", {
        entity_id: entityId,
      });
    } finally {
      setPending(false);
    }
  }

  async function setPercent(value: number) {
    if (!interactive) return;
    await callService("fan", "set_percentage", {
      entity_id: entityId,
      percentage: value,
    });
  }

  return (
    <StatusTile
      kicker="Fan"
      title={title}
      status={status}
      icon={Fan}
      active={isOn}
      glowClass="text-sky-400"
      interactive={interactive}
      onClick={() => void toggle()}
    >
      {interactive ? (
        <div
          className="mt-auto pt-3"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Slider
            value={percentage}
            min={0}
            max={100}
            size="sm"
            label="Speed"
            disabled={pending}
            onValueCommit={(value) => void setPercent(value)}
          />
        </div>
      ) : null}
    </StatusTile>
  );
}

export const fanWidget = defineWidget({
  id: "@ethio/core/fan",
  name: "Fan",
  description: "Fan speed, presets, and power",
  component: FanWidget,
  configSchema: fanConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 2, h: 1, minW: 2, minH: 1, maxW: 4, maxH: 4 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 4, h: 4 },
  entityDomains: ["fan"],
  capabilities: ["entity.read", "service.call"],
});
