import { numericAttr, stringAttr } from "./attrs";
import type { HassEntities, HassEntity } from "./types";

export const BATTERY_LOW_PERCENT = 20;

export function entityDomain(entityId: string): string {
  return entityId.split(".")[0] ?? "";
}

export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
}

function unique(ids: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

/** HA group / light group members live on `attributes.entity_id`. */
export function groupMemberIds(entity: HassEntity | undefined): string[] {
  if (!entity) return [];
  return stringList(entity.attributes.entity_id);
}

/**
 * Config `entity_ids` wins; otherwise a bound group's members; otherwise the
 * single `entity_id`.
 */
export function boundEntityIds(
  config: { entity_id?: unknown; entity_ids?: unknown },
  entity?: HassEntity,
): string[] {
  const fromConfig = unique(stringList(config.entity_ids));
  if (fromConfig.length > 0) return fromConfig;
  const members = groupMemberIds(entity);
  if (members.length > 0) return members;
  const primary = typeof config.entity_id === "string" ? config.entity_id : "";
  return primary ? [primary] : [];
}

export function isOnState(entity: HassEntity | undefined): boolean {
  if (!entity) return false;
  const state = entity.state.toLowerCase();
  if (state === "unavailable" || state === "unknown" || state === "off") {
    return false;
  }
  return state === "on" || state === "true" || state === "heat" || state === "cool";
}

export function isOpenState(entity: HassEntity | undefined): boolean {
  if (!entity) return false;
  const state = entity.state.toLowerCase();
  return state === "open" || state === "opening";
}

export function isUnlockedState(entity: HassEntity | undefined): boolean {
  if (!entity) return false;
  const state = entity.state.toLowerCase();
  return state === "unlocked" || state === "unlocking" || state === "open";
}

export function isDetectedState(entity: HassEntity | undefined): boolean {
  return isOnState(entity);
}

export interface GroupTally {
  total: number;
  active: number;
  ids: string[];
}

export function tallyEntities(
  entities: HassEntities,
  ids: string[],
  isActive: (entity: HassEntity) => boolean,
): GroupTally {
  let total = 0;
  let active = 0;
  const present: string[] = [];
  for (const id of ids) {
    const entity = entities[id];
    if (!entity || entity.state === "unavailable") continue;
    total += 1;
    present.push(id);
    if (isActive(entity)) active += 1;
  }
  return { total, active, ids: present };
}

/** "3/3 on", "1/2 on". */
export function formatFraction(
  active: number,
  total: number,
  word: string,
): string {
  return `${active}/${total} ${word}`;
}

/** "All locked" when unanimous, otherwise a fraction. */
export function formatAllOrFraction(
  active: number,
  total: number,
  labels: { all: string; none: string; word: string },
): string {
  if (total <= 0) return labels.none;
  if (active === 0) return labels.none;
  if (active === total) return labels.all;
  return formatFraction(active, total, labels.word);
}

export function countLightsOn(entities: HassEntities): number {
  let count = 0;
  for (const entity of Object.values(entities)) {
    if (entityDomain(entity.entity_id) !== "light") continue;
    if (groupMemberIds(entity).length > 0) continue;
    if (isOnState(entity)) count += 1;
  }
  return count;
}

export function isBatteryEntity(entity: HassEntity): boolean {
  if (entityDomain(entity.entity_id) !== "sensor") return false;
  return entity.attributes.device_class === "battery";
}

export function batteryPercent(entity: HassEntity): number | null {
  const raw = entity.state;
  const value = typeof raw === "number" ? raw : Number.parseFloat(raw);
  if (!Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

export interface BatteryReport {
  ids: string[];
  total: number;
  low: number;
  min: number | null;
}

export function discoverBatteries(
  entities: HassEntities,
  ids?: string[],
): BatteryReport {
  const selected =
    ids && ids.length > 0
      ? ids
      : Object.keys(entities).filter((id) => {
          const entity = entities[id];
          return entity ? isBatteryEntity(entity) : false;
        });

  let low = 0;
  let min: number | null = null;
  const present: string[] = [];

  for (const id of selected) {
    const entity = entities[id];
    if (!entity || entity.state === "unavailable") continue;
    if (!isBatteryEntity(entity) && ids === undefined) continue;
    const percent = batteryPercent(entity);
    if (percent == null) continue;
    present.push(id);
    if (min === null || percent < min) min = percent;
    if (percent <= BATTERY_LOW_PERCENT) low += 1;
  }

  return { ids: present, total: present.length, low, min };
}

export function entitiesInArea(
  areaByEntity: Record<string, string>,
  areaId: string,
): string[] {
  const ids: string[] = [];
  for (const [entityId, area] of Object.entries(areaByEntity)) {
    if (area === areaId) ids.push(entityId);
  }
  return ids;
}

export function filterByDomain(ids: string[], domain: string): string[] {
  return ids.filter((id) => entityDomain(id) === domain);
}

export interface NumericAverage {
  average: number | null;
  count: number;
  unit: string;
}

export function isTemperatureSensor(entity: HassEntity): boolean {
  return (
    entityDomain(entity.entity_id) === "sensor" &&
    entity.attributes.device_class === "temperature"
  );
}

export function averageNumericStates(
  entities: HassEntities,
  ids: string[],
): NumericAverage {
  let total = 0;
  let count = 0;
  let unit = "";
  for (const id of ids) {
    const entity = entities[id];
    if (!entity || entity.state === "unavailable") continue;
    const value = Number.parseFloat(entity.state);
    if (!Number.isFinite(value)) continue;
    total += value;
    count += 1;
    if (!unit) {
      const raw = entity.attributes.unit_of_measurement;
      if (typeof raw === "string") unit = raw;
    }
  }
  return {
    average: count > 0 ? Math.round((total / count) * 10) / 10 : null,
    count,
    unit,
  };
}

export function discoverTemperatureSensors(entities: HassEntities): string[] {
  return Object.keys(entities).filter((id) => {
    const entity = entities[id];
    return entity ? isTemperatureSensor(entity) : false;
  });
}

/** Skip HA groups so an area tile does not count the group and its members. */
export function leafIds(
  entities: HassEntities,
  ids: string[],
  domain: string,
): string[] {
  return filterByDomain(ids, domain).filter(
    (id) => groupMemberIds(entities[id]).length === 0,
  );
}

export interface AreaOverview {
  lightIds: string[];
  coverIds: string[];
  climateIds: string[];
  lights: GroupTally;
  covers: GroupTally;
  climate: HassEntity | undefined;
  current: number | undefined;
  target: number | undefined;
  unit: string;
  ideal: boolean;
}

export function deriveArea(
  entities: HassEntities,
  ids: string[],
): AreaOverview {
  const lightIds = leafIds(entities, ids, "light");
  const coverIds = leafIds(entities, ids, "cover");
  const climateIds = filterByDomain(ids, "climate");
  const climate = climateIds[0] ? entities[climateIds[0]] : undefined;
  const current = climate
    ? numericAttr(climate.attributes, "current_temperature")
    : undefined;
  const target = climate
    ? numericAttr(climate.attributes, "temperature")
    : undefined;
  const unit = stringAttr(climate?.attributes ?? {}, "temperature_unit") ?? "°";
  return {
    lightIds,
    coverIds,
    climateIds,
    lights: tallyEntities(entities, lightIds, isOnState),
    covers: tallyEntities(entities, coverIds, isOpenState),
    climate,
    current,
    target,
    unit,
    ideal:
      current != null && target != null && Math.abs(current - target) <= 1,
  };
}

export function areaSummary(
  overview: AreaOverview,
  labels: { ideal: string; empty: string },
): string {
  const facts = [
    overview.lights.total > 0
      ? formatFraction(overview.lights.active, overview.lights.total, "on")
      : null,
    overview.covers.total > 0
      ? formatFraction(overview.covers.active, overview.covers.total, "open")
      : null,
    overview.climate
      ? overview.ideal
        ? labels.ideal
        : `${overview.current ?? "—"}${overview.unit}`
      : null,
  ].filter((part): part is string => Boolean(part));
  return facts.join(" · ") || labels.empty;
}

/** If every member is already active, turn them off; otherwise turn them on. */
export function unanimousService(
  tally: GroupTally,
  activate: string,
  deactivate: string,
): string {
  return tally.total > 0 && tally.active === tally.total
    ? deactivate
    : activate;
}

export function areaStat(tally: GroupTally, empty = "—"): string {
  return tally.total ? `${tally.active}/${tally.total}` : empty;
}

export function areaCoverStat(
  tally: GroupTally,
  labels: { empty: string; allOpen: string },
): string {
  if (tally.total === 0) return labels.empty;
  if (tally.active === tally.total) return labels.allOpen;
  return `${tally.active}/${tally.total}`;
}
