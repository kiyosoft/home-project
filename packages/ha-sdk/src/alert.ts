import { stringAttr } from "./attrs";
import { entityDomain } from "./group";
import type { HassEntities } from "./types";

/** An Alert integration entity whose condition is true and not yet silenced. */
export interface ActiveAlert {
  entityId: string;
  name: string;
}

/**
 * Home Assistant Alert entities in state `on`.
 * `idle` means the condition is false; `off` means it was acknowledged.
 */
export function activeAlerts(entities: HassEntities): ActiveAlert[] {
  const alerts: ActiveAlert[] = [];
  for (const entity of Object.values(entities)) {
    if (entityDomain(entity.entity_id) !== "alert" || entity.state !== "on") {
      continue;
    }
    alerts.push({
      entityId: entity.entity_id,
      name: stringAttr(entity.attributes, "friendly_name") ?? entity.entity_id,
    });
  }
  alerts.sort((a, b) => a.name.localeCompare(b.name));
  return alerts;
}
