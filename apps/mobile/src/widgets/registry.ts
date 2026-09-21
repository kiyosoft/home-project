import {
  isSinksarEntity,
  isTeamTrackerEntity,
  type HassEntity,
} from "@ethio/ha-sdk";
import type { MobileWidget, TileSize } from "@ethio/mobile-schema";

import { entityDomain } from "@/store/use-entity";
import { AreaTile } from "@/widgets/tiles/AreaTile";
import { BatteriesTile } from "@/widgets/tiles/BatteriesTile";
import { CameraTile } from "@/widgets/tiles/CameraTile";
import { ClimateSensorsTile } from "@/widgets/tiles/ClimateSensorsTile";
import { ClimateTile } from "@/widgets/tiles/ClimateTile";
import { ClockTile } from "@/widgets/tiles/ClockTile";
import { CoverTile } from "@/widgets/tiles/CoverTile";
import { EntityStateTile } from "@/widgets/tiles/EntityStateTile";
import { FanTile } from "@/widgets/tiles/FanTile";
import { LightTile } from "@/widgets/tiles/LightTile";
import { LockTile } from "@/widgets/tiles/LockTile";
import { MediaTile } from "@/widgets/tiles/MediaTile";
import { SceneTile } from "@/widgets/tiles/SceneTile";
import { SinksarTile } from "@/widgets/tiles/SinksarTile";
import { TeamTrackerTile } from "@/widgets/tiles/TeamTrackerTile";
import { TodoTile } from "@/widgets/tiles/TodoTile";
import { ToggleTile } from "@/widgets/tiles/ToggleTile";
import { WeatherTile } from "@/widgets/tiles/WeatherTile";
import type { MobileWidgetDef } from "@/widgets/types";

/**
 * Ids match the web dashboard's widget types, so one entity binding reads the
 * same on both platforms. Order matters: a domain section picks the first
 * widget that claims the entity.
 */
export const MOBILE_WIDGETS: MobileWidgetDef[] = [
  {
    id: "@ethio/core/clock",
    component: ClockTile,
    defaultSize: "lg",
    domains: [],
  },
  {
    id: "@ethio/core/batteries",
    component: BatteriesTile,
    defaultSize: "md",
    domains: [],
  },
  {
    id: "@ethio/core/area",
    component: AreaTile,
    defaultSize: "lg",
    domains: [],
  },
  {
    id: "@ethio/core/climate-sensors",
    component: ClimateSensorsTile,
    defaultSize: "md",
    domains: [],
  },
  {
    id: "@ethio/core/scene",
    component: SceneTile,
    defaultSize: "sm",
    domains: ["scene", "script"],
  },
  {
    id: "@ethio/core/light",
    component: LightTile,
    defaultSize: "md",
    domains: ["light"],
  },
  {
    id: "@ethio/core/fan",
    component: FanTile,
    defaultSize: "sm",
    domains: ["fan"],
  },
  {
    id: "@ethio/core/toggle",
    component: ToggleTile,
    defaultSize: "sm",
    domains: ["switch", "input_boolean"],
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
    id: "@ethio/core/weather",
    component: WeatherTile,
    defaultSize: "lg",
    domains: ["weather"],
  },
  {
    id: "@ethio/core/camera",
    component: CameraTile,
    defaultSize: "md",
    domains: ["camera"],
  },
  {
    id: "@ethio/core/media",
    component: MediaTile,
    defaultSize: "md",
    domains: ["media_player"],
  },
  {
    id: "@ethio/core/todo",
    component: TodoTile,
    defaultSize: "md",
    domains: ["todo"],
  },
  {
    id: "@ethio/sinksar/today",
    component: SinksarTile,
    defaultSize: "md",
    domains: ["sensor"],
    matches: isSinksarEntity,
  },
  {
    id: "@ethio/teamtracker/team-card",
    component: TeamTrackerTile,
    defaultSize: "md",
    domains: ["sensor"],
    matches: isTeamTrackerEntity,
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

export function newWidgetId(sectionId: string, key: string): string {
  return `${sectionId}:${key}:${Date.now().toString(36)}`;
}

export function widgetFromType(
  sectionId: string,
  type: string,
  config: Record<string, unknown>,
  size?: TileSize,
): MobileWidget | null {
  const def = findWidget(type);
  if (!def) return null;
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  return {
    id: entityId
      ? `${sectionId}:${entityId}`
      : newWidgetId(sectionId, type.split("/").pop() ?? type),
    type,
    config,
    size: size ?? def.defaultSize,
  };
}
