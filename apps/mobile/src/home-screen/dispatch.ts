import { hapticToggle } from "@/lib/haptics";
import { callServiceOnHub } from "@/lib/webhook";
import { useHaStore } from "@/store/ha-store";

import { deliverWidgetWebhook, sendWidgetServiceCall } from "./deliver";
import { serviceCallForTarget } from "./types";

export { targetFromWidgetEvent } from "./types";

export function dispatchWidgetTarget(target: unknown): void {
  const { callService, entities, recoverRegistration } = useHaStore.getState();
  const call = serviceCallForTarget(target, entities);
  if (!call) return;
  hapticToggle();
  void sendWidgetServiceCall(call, {
    callService,
    callViaWebhook: (next) =>
      deliverWidgetWebhook(next, {
        send: (item) =>
          callServiceOnHub({
            domain: item.domain,
            service: item.service,
            serviceData: item.serviceData ?? { entity_id: item.entityId },
          }),
        recoverRegistration,
      }),
  }).catch((error: unknown) => {
    console.warn("widget service call failed", error);
  });
}
