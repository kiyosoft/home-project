import type { EntityClient, HassEntities, HassEntity } from "./types";

/** How long after `last_changed` a home arrival still counts as a welcome. */
export const ARRIVAL_WINDOW_MS = 30 * 60 * 1000;

export interface HassCurrentUser {
  id: string;
  name: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function personUserId(entity: HassEntity): string | undefined {
  return asString(entity.attributes.user_id);
}

export function isPersonEntityId(entityId: string): boolean {
  return entityId.startsWith("person.");
}

export function personDisplayName(entity: HassEntity): string {
  const friendly = asString(entity.attributes.friendly_name);
  if (friendly) return friendly;
  const objectId = entity.entity_id.slice("person.".length);
  return objectId
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/**
 * Home Assistant's signed-in user for this connection. Missing on older cores
 * and anything that will not answer `auth/current_user`.
 */
export async function fetchCurrentUser(
  sendMessagePromise: EntityClient["sendMessagePromise"],
): Promise<HassCurrentUser | null> {
  try {
    const raw = await sendMessagePromise<unknown>({ type: "auth/current_user" });
    if (!isRecord(raw)) return null;
    const id = asString(raw.id);
    if (!id) return null;
    return { id, name: asString(raw.name) ?? "" };
  } catch {
    return null;
  }
}

/** The Person linked to a Home Assistant user in Settings → People. */
export function personForUser(
  entities: HassEntities,
  userId: string,
): HassEntity | undefined {
  if (!userId) return undefined;
  for (const entity of Object.values(entities)) {
    if (!entity || !isPersonEntityId(entity.entity_id)) continue;
    if (personUserId(entity) === userId) return entity;
  }
  return undefined;
}

export function shouldShowArrivalWelcome(options: {
  person: HassEntity | undefined;
  previousState?: string;
  now: number;
  windowMs?: number;
}): boolean {
  const { person, previousState, now } = options;
  if (!person || person.state !== "home") return false;
  if (previousState === "unavailable" || previousState === "unknown") {
    return false;
  }
  const changed = Date.parse(person.last_changed ?? "");
  if (!Number.isFinite(changed)) return false;
  const windowMs = options.windowMs ?? ARRIVAL_WINDOW_MS;
  const age = now - changed;
  return age >= 0 && age < windowMs;
}

/**
 * Among people with an HA account, the one who most recently arrived home.
 * Persons without `user_id` are guests/trackers and do not trigger a welcome.
 */
export function latestAccountArrival(options: {
  entities: HassEntities;
  now: number;
  previousStates?: Record<string, string>;
  windowMs?: number;
}): HassEntity | undefined {
  let best: HassEntity | undefined;
  let bestChanged = Number.NEGATIVE_INFINITY;

  for (const entity of Object.values(options.entities)) {
    if (!entity || !isPersonEntityId(entity.entity_id)) continue;
    if (!personUserId(entity)) continue;
    const previous = options.previousStates?.[entity.entity_id];
    if (
      !shouldShowArrivalWelcome({
        person: entity,
        previousState: previous,
        now: options.now,
        windowMs: options.windowMs,
      })
    ) {
      continue;
    }
    const changed = Date.parse(entity.last_changed ?? "");
    if (changed >= bestChanged) {
      best = entity;
      bestChanged = changed;
    }
  }

  return best;
}
