import type { EntityClient } from "./types";

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  icon?: string | null;
  floor_id?: string | null;
}

export interface EntityRegistryEntry {
  entity_id: string;
  area_id?: string | null;
  device_id?: string | null;
}

export interface DeviceRegistryEntry {
  id: string;
  area_id?: string | null;
}

export interface AreaIndex {
  areas: AreaRegistryEntry[];
  areaByEntity: Record<string, string>;
}

export const EMPTY_AREA_INDEX: AreaIndex = { areas: [], areaByEntity: {} };

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeAreas(raw: unknown): AreaRegistryEntry[] {
  if (!Array.isArray(raw)) return [];
  const areas: AreaRegistryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const areaId = str(record.area_id);
    if (!areaId) continue;
    areas.push({
      area_id: areaId,
      name: str(record.name) ?? areaId,
      icon: str(record.icon) ?? null,
      floor_id: str(record.floor_id) ?? null,
    });
  }
  return areas.sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeEntities(raw: unknown): EntityRegistryEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: EntityRegistryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const entityId = str(record.entity_id);
    if (!entityId) continue;
    entries.push({
      entity_id: entityId,
      area_id: str(record.area_id) ?? null,
      device_id: str(record.device_id) ?? null,
    });
  }
  return entries;
}

function normalizeDevices(raw: unknown): DeviceRegistryEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: DeviceRegistryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = str(record.id);
    if (!id) continue;
    entries.push({ id, area_id: str(record.area_id) ?? null });
  }
  return entries;
}

/**
 * Reads the three registries and flattens them into an entity -> area lookup.
 * An entity's own area wins; otherwise it inherits from its device.
 */
export async function fetchAreaIndex(client: EntityClient): Promise<AreaIndex> {
  const [areasRaw, entitiesRaw, devicesRaw] = await Promise.all([
    client.sendMessagePromise<unknown>({ type: "config/area_registry/list" }),
    client.sendMessagePromise<unknown>({ type: "config/entity_registry/list" }),
    client.sendMessagePromise<unknown>({ type: "config/device_registry/list" }),
  ]);

  const areas = normalizeAreas(areasRaw);
  const known = new Set(areas.map((area) => area.area_id));
  const deviceAreas = new Map<string, string>();
  for (const device of normalizeDevices(devicesRaw)) {
    if (device.area_id && known.has(device.area_id)) {
      deviceAreas.set(device.id, device.area_id);
    }
  }

  const areaByEntity: Record<string, string> = {};
  for (const entry of normalizeEntities(entitiesRaw)) {
    const own = entry.area_id && known.has(entry.area_id) ? entry.area_id : undefined;
    const inherited = entry.device_id ? deviceAreas.get(entry.device_id) : undefined;
    const areaId = own ?? inherited;
    if (areaId) areaByEntity[entry.entity_id] = areaId;
  }

  return { areas, areaByEntity };
}
