import {
  deriveLight,
  lightSupportsBrightness,
  lightSupportsRgb,
  type AreaRegistryEntry,
  type HassEntities,
  type HassEntity,
} from "@ethio/ha-sdk";
import type { MobileDashboard } from "@ethio/mobile-schema";

import {
  UNASSIGNED_AREA_ID,
  isControllableDomain,
  isSnappableDomain,
  type WatchCatalog,
  type WatchCatalogEntity,
  type WatchEntityCapabilities,
  type WatchEntityState,
  type WatchSnapshot,
} from "./types";

function entityDomain(entityId: string): string {
  const index = entityId.indexOf(".");
  return index > 0 ? entityId.slice(0, index) : "";
}

function entityName(
  entity: { attributes?: Record<string, unknown> } | undefined,
  entityId: string,
): string {
  const friendly = entity?.attributes?.friendly_name;
  if (typeof friendly === "string" && friendly.trim()) return friendly;
  const objectId = entityId.includes(".")
    ? entityId.slice(entityId.indexOf(".") + 1)
    : entityId;
  return objectId
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const UNASSIGNED_AREA = {
  id: UNASSIGNED_AREA_ID,
  name: "Unassigned",
};

export function isSnappableEntityId(entityId: string): boolean {
  return isSnappableDomain(entityDomain(entityId));
}

export function isControllableEntityId(entityId: string): boolean {
  return isControllableDomain(entityDomain(entityId));
}

export function defaultWatchEntityIds(
  document: MobileDashboard | null,
  entities: HassEntities,
): string[] {
  const pinned = (document?.favorites ?? []).filter(isControllableEntityId);
  if (pinned.length) return unique(pinned);

  const fallback: string[] = [];
  for (const entityId of Object.keys(entities)) {
    if (!isControllableEntityId(entityId)) continue;
    fallback.push(entityId);
    if (fallback.length >= 8) break;
  }
  return fallback;
}

export function entityCapabilities(
  entity: HassEntity | undefined,
  domain: string,
): WatchEntityCapabilities {
  if (domain === "light") {
    const capabilities: WatchEntityCapabilities = {};
    if (lightSupportsBrightness(entity)) capabilities.brightness = true;
    if (lightSupportsRgb(entity)) capabilities.color = true;
    return capabilities;
  }
  if (domain === "lock") {
    const format = entity?.attributes?.code_format;
    if (typeof format === "string" && format.trim()) {
      return { lockCode: true };
    }
  }
  return {};
}

export function buildWatchCatalog(options: {
  entities: HassEntities;
  areas: AreaRegistryEntry[];
  areaByEntity: Record<string, string>;
  selectedIds: string[];
  favoriteIds?: string[];
  atHome: boolean;
  currentAreaId: string;
}): WatchCatalog {
  const {
    entities,
    areas,
    areaByEntity,
    selectedIds,
    favoriteIds = [],
    atHome,
    currentAreaId,
  } = options;
  const favorites = new Set(favoriteIds);
  const catalogEntities: WatchCatalogEntity[] = [];
  const usedAreas = new Set<string>();

  for (const entityId of selectedIds) {
    if (!isControllableEntityId(entityId)) continue;
    const entity = entities[entityId];
    const domain = entityDomain(entityId);
    const areaId = areaByEntity[entityId] ?? UNASSIGNED_AREA.id;
    usedAreas.add(areaId);
    catalogEntities.push({
      id: entityId,
      name: entityName(entity, entityId),
      areaId,
      domain,
      favorite: favorites.has(entityId),
      capabilities: entityCapabilities(entity, domain),
    });
  }

  const catalogAreas = areas
    .filter((area) => usedAreas.has(area.area_id))
    .map((area) => ({ id: area.area_id, name: area.name }));
  if (usedAreas.has(UNASSIGNED_AREA.id)) {
    catalogAreas.push(UNASSIGNED_AREA);
  }

  return {
    areas: catalogAreas,
    entities: catalogEntities,
    atHome,
    currentAreaId:
      currentAreaId && catalogAreas.some((area) => area.id === currentAreaId)
        ? currentAreaId
        : (catalogAreas[0]?.id ?? ""),
  };
}

export function buildWatchSnapshot(options: {
  entities: HassEntities;
  catalog: WatchCatalog;
  atHome: boolean;
  connected: boolean;
}): WatchSnapshot {
  const { entities, catalog, atHome, connected } = options;
  const states: Record<string, WatchEntityState> = {};
  const areas: WatchSnapshot["areas"] = {};
  let lightsOn = 0;
  let lockCount = 0;
  let unlocked = 0;

  for (const item of catalog.entities) {
    const entity = entities[item.id];
    const state = entity?.state ?? "unavailable";
    const row: WatchEntityState = { state };
    const area = areas[item.areaId] ?? { lightsOn: 0, unlocked: 0 };

    if (item.domain === "light") {
      const light = deriveLight(entity);
      if (light) {
        row.brightness = light.brightnessPercent;
        if (light.isOn) {
          lightsOn += 1;
          area.lightsOn += 1;
        }
      }
    } else if (item.domain === "lock") {
      lockCount += 1;
      if (state === "unlocked") {
        unlocked += 1;
        area.unlocked += 1;
      }
    }

    areas[item.areaId] = area;
    states[item.id] = row;
  }

  return {
    atHome,
    connected,
    summary: { lightsOn, lockCount, unlocked },
    areas,
    states,
  };
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}
