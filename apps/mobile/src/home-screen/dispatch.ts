import { serviceForSceneEntity } from "@ethio/mobile-schema";

import { useHaStore } from "@/store/ha-store";
import { entityDomain } from "@/store/use-entity";

import { isToggleDomain, parseWidgetAction } from "./types";

export function dispatchWidgetTarget(target: string): void {
  const action = parseWidgetAction(target);
  if (!action) return;

  const { callService, entities } = useHaStore.getState();

  if (action.kind === "scene") {
    const call = serviceForSceneEntity(action.entityId);
    if (!call) return;
    void callService(call.domain, call.service, {
      entity_id: action.entityId,
    }).catch(() => {});
    return;
  }

  const domain = entityDomain(action.entityId);
  if (!isToggleDomain(domain)) return;
  const isOn = entities[action.entityId]?.state === "on";
  void callService(domain, isOn ? "turn_off" : "turn_on", {
    entity_id: action.entityId,
  }).catch(() => {});
}
