import type { AreaRegistryEntry, HassEntities, HassEntity } from "@ethio/ha-sdk";

import { HA_SNAPSHOT_KEY } from "@/lib/kv-keys";
import { kv } from "@/lib/kv-mmkv";

export interface HaSnapshot {
  entities: HassEntities;
  areas: AreaRegistryEntry[];
  areaByEntity: Record<string, string>;
  /** Signed-in person's name. Empty on snapshots taken before this field. */
  userName: string;
  /** HA user id. Empty on snapshots taken before this field. */
  userId: string;
}

export function loadHaSnapshot(): HaSnapshot | null {
  return parseSnapshot(kv.getJson(HA_SNAPSHOT_KEY));
}

export function saveHaSnapshot(snapshot: HaSnapshot): void {
  kv.setJson(HA_SNAPSHOT_KEY, snapshot);
}

export function clearHaSnapshot(): void {
  kv.remove(HA_SNAPSHOT_KEY);
}

function parseSnapshot(value: unknown): HaSnapshot | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const entities = parseEntities(raw.entities);
  const areas = parseAreas(raw.areas);
  const areaByEntity = parseAreaByEntity(raw.areaByEntity);
  if (!entities || !areas || !areaByEntity) return null;
  return {
    entities,
    areas,
    areaByEntity,
    userName: parseName(raw.userName),
    userId: parseName(raw.userId),
  };
}

function parseName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseEntities(value: unknown): HassEntities | null {
  if (typeof value !== "object" || value === null) return null;
  const entities: HassEntities = {};
  for (const [entityId, entry] of Object.entries(value)) {
    const entity = parseEntity(entry, entityId);
    if (entity) entities[entityId] = entity;
  }
  return entities;
}

function parseEntity(value: unknown, entityId: string): HassEntity | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.state !== "string") return null;
  return {
    entity_id: typeof raw.entity_id === "string" ? raw.entity_id : entityId,
    state: raw.state,
    attributes:
      typeof raw.attributes === "object" && raw.attributes !== null
        ? (raw.attributes as Record<string, unknown>)
        : {},
    last_changed:
      typeof raw.last_changed === "string" ? raw.last_changed : undefined,
    last_updated:
      typeof raw.last_updated === "string" ? raw.last_updated : undefined,
  };
}

function parseAreas(value: unknown): AreaRegistryEntry[] | null {
  if (!Array.isArray(value)) return null;
  const areas: AreaRegistryEntry[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const raw = entry as Record<string, unknown>;
    if (typeof raw.area_id !== "string" || typeof raw.name !== "string") {
      continue;
    }
    const area: AreaRegistryEntry = { area_id: raw.area_id, name: raw.name };
    if (typeof raw.icon === "string" || raw.icon === null) area.icon = raw.icon;
    if (typeof raw.floor_id === "string" || raw.floor_id === null) {
      area.floor_id = raw.floor_id;
    }
    areas.push(area);
  }
  return areas;
}

function parseAreaByEntity(value: unknown): Record<string, string> | null {
  if (typeof value !== "object" || value === null) return null;
  const map: Record<string, string> = {};
  for (const [entityId, areaId] of Object.entries(value)) {
    if (typeof areaId === "string") map[entityId] = areaId;
  }
  return map;
}
