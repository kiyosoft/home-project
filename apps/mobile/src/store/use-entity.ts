import type { HassEntity } from "@ethio/ha-sdk";

import { useHaStore } from "@/store/ha-store";

/**
 * The store shallow-copies the entity map on every HA update but keeps entity
 * objects shared, so this re-renders only when the named entity actually moves.
 */
export function useEntity(entityId: string | undefined): HassEntity | undefined {
  return useHaStore((state) => (entityId ? state.entities[entityId] : undefined));
}

export function entityName(
  entity: HassEntity | undefined,
  entityId?: string,
): string {
  const friendly = entity?.attributes.friendly_name;
  if (typeof friendly === "string" && friendly.trim()) return friendly;

  const id = entity?.entity_id ?? entityId ?? "";
  const objectId = id.includes(".") ? id.slice(id.indexOf(".") + 1) : id;
  return objectId
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function entityDomain(entityId: string): string {
  const index = entityId.indexOf(".");
  return index > 0 ? entityId.slice(0, index) : "";
}

export function isUnavailable(entity: HassEntity | undefined): boolean {
  return !entity || entity.state === "unavailable" || entity.state === "unknown";
}
