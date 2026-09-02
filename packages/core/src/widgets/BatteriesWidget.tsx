import { BatteryFull, BatteryLow } from "lucide-react";
import { z } from "zod";

import {
  discoverBatteries,
  stringList,
} from "@ethio/ha-sdk";
import {
  defineWidget,
  useEntities,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { StatusTile } from "./StatusTile";
import { widgetTitle } from "./names";

export const batteriesConfigSchema = z.object({
  title: z.string().default(""),
  entity_ids: z.array(z.string()).default([]),
});

function BatteriesWidget({ config }: WidgetComponentProps) {
  const customTitle = widgetTitle(config);
  const configured = stringList(config.entity_ids);
  const entities = useEntities();
  const report = discoverBatteries(
    entities,
    configured.length > 0 ? configured : undefined,
  );
  const ok = report.total > 0 && report.low === 0;
  const status =
    report.total === 0
      ? "No batteries"
      : ok
        ? "All good"
        : `${report.low} low`;
  const Icon = ok ? BatteryFull : BatteryLow;

  return (
    <StatusTile
      kicker="Batteries"
      title={customTitle || "Batteries"}
      status={status}
      icon={Icon}
      active={ok}
      glowClass="text-emerald-400"
    />
  );
}

export const batteriesWidget = defineWidget({
  id: "@ethio/core/batteries",
  name: "Batteries",
  description: "Auto-discover and monitor battery levels",
  component: BatteriesWidget,
  configSchema: batteriesConfigSchema,
  defaultConfig: { title: "", entity_ids: [] },
  defaultSize: { w: 2, h: 1, minW: 2, minH: 1, maxW: 4, maxH: 3 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 4, h: 3 },
  entityDomains: ["sensor"],
  capabilities: ["entity.read"],
});
