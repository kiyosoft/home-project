import type { AreaRegistryEntry, HassEntities } from "@ethio/ha-sdk";
import type { MobileDashboard } from "@ethio/mobile-schema";

import type { WatchCatalog, WatchCatalogEntity } from "./types";

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

import { isSnappableDomain } from "./types";

const UNASSIGNED_AREA = {
  id: "unassigned",
  name: "Unassigned",
};

export function isSnappableEntityId(entityId: string): boolean {
  return isSnappableDomain(entityDomain(entityId));
}

export function defaultWatchEntityIds(
  document: MobileDashboard | null,
  entities: HassEntities,
): string[] {
  const pinned = (document?.favorites ?? []).filter(isSnappableEntityId);
  if (pinned.length) return unique(pinned);

  const fallback: string[] = [];
  for (const entityId of Object.keys(entities)) {
    if (!isSnappableEntityId(entityId)) continue;
    fallback.push(entityId);
    if (fallback.length >= 8) break;
  }
  return fallback;
}

export function buildWatchCatalog(options: {
  entities: HassEntities;
  areas: AreaRegistryEntry[];
  areaByEntity: Record<string, string>;
  selectedIds: string[];
  atHome: boolean;
  currentAreaId: string;
}): WatchCatalog {
  const { entities, areas, areaByEntity, selectedIds, atHome, currentAreaId } =
    options;
  const catalogEntities: WatchCatalogEntity[] = [];
  const usedAreas = new Set<string>();

  for (const entityId of selectedIds) {
    if (!isSnappableEntityId(entityId)) continue;
    const entity = entities[entityId];
    const areaId = areaByEntity[entityId] ?? UNASSIGNED_AREA.id;
    usedAreas.add(areaId);
    catalogEntities.push({
      id: entityId,
      name: entityName(entity, entityId),
      areaId,
      domain: entityDomain(entityId),
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

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}
