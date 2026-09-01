import {
  firstName,
  latestAccountArrival,
  personDisplayName,
  type HassEntities,
} from "@ethio/ha-sdk";

import { useHaStore } from "@/store/ha-store";

let previousPersonStates: Record<string, string> = {};
let cachedVariables: Record<string, unknown> = {
  user: "",
  user_id: "",
  name: "",
  person: "",
  arrived: false,
};

export function previousPeopleSnapshot(): Record<string, string> {
  return previousPersonStates;
}

export function snapshotPreviousPeople(previous: HassEntities): void {
  const next: Record<string, string> = {};
  for (const [entityId, entity] of Object.entries(previous)) {
    if (entityId.startsWith("person.") && entity) {
      next[entityId] = entity.state;
    }
  }
  previousPersonStates = next;
}

export function refreshTemplateVariables(now = Date.now()): Record<string, unknown> {
  const { entities, userName, userId } = useHaStore.getState();
  const arrival = latestAccountArrival({
    entities,
    now,
    previousStates: previousPersonStates,
  });
  cachedVariables = {
    user: userName,
    user_id: userId,
    name: arrival ? firstName(personDisplayName(arrival)) : "",
    person: arrival?.entity_id ?? "",
    arrived: Boolean(arrival),
  };
  return cachedVariables;
}

export function dashboardTemplateVariables(): Record<string, unknown> {
  return cachedVariables;
}
