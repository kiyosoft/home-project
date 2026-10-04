import { stringAttr } from "./attrs";
import {
  BATTERY_LOW_PERCENT,
  batteryPercent,
  entityDomain,
  isBatteryEntity,
} from "./group";
import type { HassEntities, HassEntity } from "./types";

/** How long a door or window can stay open before it is worth a banner. */
const OPENING_MS = 10 * 60_000;

const SAFETY = new Set([
  "smoke",
  "gas",
  "carbon_monoxide",
  "moisture",
  "safety",
]);
const PROBLEM = new Set(["problem", "tamper"]);
const OPENING = new Set(["door", "window", "garage_door", "opening"]);
const ACTIVE = new Set(["on", "open", "detected"]);
/** Being down is the problem, even when the entity is not on a dashboard. */
const UNAVAILABLE_DOMAINS = new Set([
  "lock",
  "alarm_control_panel",
  "camera",
  "climate",
  "cover",
  "media_player",
  "fan",
  "vacuum",
  "humidifier",
]);

const KIND_ORDER = {
  jammed: 0,
  alarm: 1,
  safety: 2,
  unavailable: 3,
  problem: 4,
  opening: 5,
  unlocked: 6,
  battery: 7,
} as const;

export type AttentionKind = keyof typeof KIND_ORDER;

export interface AttentionItem {
  entityId: string;
  name: string;
  kind: AttentionKind;
  /** Set for a battery sensor. Null for every other kind, including a binary "battery low". */
  level: number | null;
}

export function configEntityIds(config: Record<string, unknown>): string[] {
  const ids: string[] = [];
  if (typeof config.entity_id === "string" && config.entity_id.includes(".")) {
    ids.push(config.entity_id);
  }
  if (!Array.isArray(config.entity_ids)) return ids;
  for (const id of config.entity_ids) {
    if (typeof id === "string" && id.includes(".")) ids.push(id);
  }
  return ids;
}

function deviceClass(entity: HassEntity): string {
  const value = entity.attributes.device_class;
  return typeof value === "string" ? value : "";
}

function nameOf(entity: HassEntity): string {
  return stringAttr(entity.attributes, "friendly_name") ?? entity.entity_id;
}

function openLongEnough(entity: HassEntity, now: number): boolean {
  if (!entity.last_changed) return true;
  const since = Date.parse(entity.last_changed);
  if (Number.isNaN(since)) return true;
  return now - since >= OPENING_MS;
}

function classify(
  entity: HassEntity,
  watched: Set<string>,
  now: number,
): AttentionItem | null {
  const domain = entityDomain(entity.entity_id);
  const state = entity.state;
  const name = nameOf(entity);
  const base = { entityId: entity.entity_id, name, level: null };

  if (state === "unavailable" || state === "unknown") {
    // A scene stays "unknown" until someone runs it. That is not a failure.
    if (UNAVAILABLE_DOMAINS.has(domain)) {
      return { ...base, kind: "unavailable" };
    }
    if (state === "unavailable" && watched.has(entity.entity_id)) {
      return { ...base, kind: "unavailable" };
    }
    return null;
  }

  const klass = deviceClass(entity);
  if (domain === "binary_sensor" && SAFETY.has(klass) && ACTIVE.has(state)) {
    return { ...base, kind: "safety" };
  }
  if (domain === "binary_sensor" && PROBLEM.has(klass) && ACTIVE.has(state)) {
    return { ...base, kind: "problem" };
  }
  if (
    domain === "binary_sensor" &&
    OPENING.has(klass) &&
    ACTIVE.has(state) &&
    openLongEnough(entity, now)
  ) {
    return { ...base, kind: "opening" };
  }
  if (domain === "lock" && state === "jammed") {
    return { ...base, kind: "jammed" };
  }
  if (domain === "lock" && (state === "unlocked" || state === "open")) {
    return { ...base, kind: "unlocked" };
  }
  if (domain === "alarm_control_panel" && state === "triggered") {
    return { ...base, kind: "alarm" };
  }
  if (isBatteryEntity(entity)) {
    const level = batteryPercent(entity);
    // ponytail: a charging device still shows. Hide it once device ids are on hand.
    if (level != null && level <= BATTERY_LOW_PERCENT) {
      return { ...base, kind: "battery", level };
    }
  }
  if (
    domain === "binary_sensor" &&
    klass === "battery" &&
    state === "on"
  ) {
    return { ...base, kind: "battery" };
  }
  return null;
}

/** Problems worth a banner. `watched` adds dashboard entities that are simply unavailable. */
export function attentionItems(
  entities: HassEntities,
  watched: Iterable<string> = [],
  now = Date.now(),
): AttentionItem[] {
  const watchedIds = new Set(watched);
  const items: AttentionItem[] = [];
  for (const entity of Object.values(entities)) {
    const item = classify(entity, watchedIds, now);
    if (item) items.push(item);
  }
  items.sort((a, b) => {
    const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (byKind !== 0) return byKind;
    return a.name.localeCompare(b.name);
  });
  return items;
}
