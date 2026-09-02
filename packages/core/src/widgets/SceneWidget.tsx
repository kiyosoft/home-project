import { Palette } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { entityDomain } from "@ethio/ha-sdk";
import {
  defineWidget,
  useCallService,
  useEntity,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { friendlyName, widgetEntityId, widgetTitle } from "./names";
import { StatusTile } from "./StatusTile";

export const sceneConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function SceneWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const entity = useEntity(entityId);
  const callService = useCallService();
  const [pending, setPending] = useState(false);

  if (!entityId) {
    return (
      <StatusTile
        kicker="Scenes"
        title={customTitle || "Scenes"}
        status="Pick a scene"
        icon={Palette}
      />
    );
  }

  const title = customTitle || friendlyName(entity, "Scenes");

  async function activate() {
    if (!interactive || pending) return;
    setPending(true);
    try {
      await callService(entityDomain(entityId) || "scene", "turn_on", {
        entity_id: entityId,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <StatusTile
      kicker="Scenes"
      title={title}
      status={pending ? "Activating…" : "Activate"}
      icon={Palette}
      active
      glowClass="text-orange-400"
      interactive={interactive}
      onClick={() => void activate()}
    />
  );
}

export const sceneWidget = defineWidget({
  id: "@ethio/core/scene",
  name: "Scene",
  description: "Activate a scene or script",
  component: SceneWidget,
  configSchema: sceneConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 2, h: 1, minW: 2, minH: 1, maxW: 4, maxH: 3 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 4, h: 3 },
  entityDomains: ["scene", "script"],
  capabilities: ["entity.read", "service.call"],
});
