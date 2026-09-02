import { Eye } from "lucide-react";
import { z } from "zod";

import {
  averageNumericStates,
  discoverTemperatureSensors,
  stringList,
} from "@ethio/ha-sdk";
import {
  defineWidget,
  useEntities,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { StatusTile } from "./StatusTile";
import { widgetTitle } from "./names";

export const climateSensorsConfigSchema = z.object({
  title: z.string().default(""),
  entity_ids: z.array(z.string()).default([]),
});

function ClimateSensorsWidget({ config }: WidgetComponentProps) {
  const customTitle = widgetTitle(config);
  const configured = stringList(config.entity_ids);
  const entities = useEntities();
  const ids =
    configured.length > 0 ? configured : discoverTemperatureSensors(entities);
  const stats = averageNumericStates(entities, ids);
  const status =
    stats.average == null
      ? "No sensors"
      : `${stats.average}${stats.unit || "°"}`;

  return (
    <StatusTile
      kicker="Climate Sensors"
      title={customTitle || "Climate Sensors"}
      status={stats.count === 0 ? "Unavailable" : status}
      icon={Eye}
      active={stats.count > 0}
      glowClass="text-sky-400"
    />
  );
}

export const climateSensorsWidget = defineWidget({
  id: "@ethio/core/climate-sensors",
  name: "Climate Sensors",
  description: "Average temperature across climate sensors",
  component: ClimateSensorsWidget,
  configSchema: climateSensorsConfigSchema,
  defaultConfig: { title: "", entity_ids: [] },
  defaultSize: { w: 2, h: 1, minW: 2, minH: 1, maxW: 4, maxH: 4 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 4, h: 4 },
  entityDomains: ["sensor"],
  capabilities: ["entity.read"],
});
