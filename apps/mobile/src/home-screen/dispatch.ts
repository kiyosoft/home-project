import { useHaStore } from "@/store/ha-store";

import { serviceCallForTarget } from "./types";

export { targetFromWidgetEvent } from "./types";

export function dispatchWidgetTarget(target: unknown): void {
  const { callService, entities } = useHaStore.getState();
  const call = serviceCallForTarget(target, entities);
  if (!call) return;
  void callService(call.domain, call.service, {
    entity_id: call.entityId,
  }).catch(() => {});
}
