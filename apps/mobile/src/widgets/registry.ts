import { isSinksarEntity, type HassEntity } from "@ethio/ha-sdk";

import { entityDomain } from "@/store/use-entity";
import { ClimateTile } from "@/widgets/tiles/ClimateTile";
import { CoverTile } from "@/widgets/tiles/CoverTile";
import { EntityStateTile } from "@/widgets/tiles/EntityStateTile";
import { LightTile } from "@/widgets/tiles/LightTile";
import { LockTile } from "@/widgets/tiles/LockTile";
import { SinksarTile } from "@/widgets/tiles/SinksarTile";
import { ToggleTile } from "@/widgets/tiles/ToggleTile";
import type { MobileWidgetDef } from "@/widgets/types";

/**
 * Ids match the web dashboard's widget types, so one entity binding reads the
 * same on both platforms. Order matters: a domain section picks the first
 * widget that claims the entity.
 */
export const MOBILE_WIDGETS: MobileWidgetDef[] = [
  {
    id: "@ethio/core/light",
    component: LightTile,
    defaultSize: "md",
    domains: ["light"],
  },
  {
    id: "@ethio/core/toggle",
    component: ToggleTile,
    defaultSize: "sm",
    domains: ["switch", "input_boolean", "fan"],
  },
  {
    id: "@ethio/core/lock",
    component: LockTile,
    defaultSize: "sm",
    domains: ["lock"],
  },
  {
    id: "@ethio/core/climate",
    component: ClimateTile,
    defaultSize: "md",
    domains: ["climate"],
  },
  {
    id: "@ethio/core/cover",
    component: CoverTile,
    defaultSize: "md",
    domains: ["cover"],
  },
  {
    id: "@ethio/sinksar/today",
    component: SinksarTile,
    defaultSize: "md",
    domains: ["sensor"],
    matches: isSinksarEntity,
  },
  {
    id: "@ethio/core/entity-state",
    component: EntityStateTile,
    defaultSize: "sm",
    domains: ["sensor", "binary_sensor"],
  },
];

const BY_ID = new Map(MOBILE_WIDGETS.map((def) => [def.id, def]));

export function findWidget(type: string): MobileWidgetDef | undefined {
  return BY_ID.get(type);
}

export function widgetForEntity(
  entity: HassEntity,
): MobileWidgetDef | undefined {
  const domain = entityDomain(entity.entity_id);
  if (!domain) return undefined;
  return MOBILE_WIDGETS.find((def) => {
    if (!def.domains.includes(domain)) return false;
    return def.matches ? def.matches(entity) : true;
  });
}
