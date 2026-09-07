import { hapticToggle } from "@/lib/haptics";
import { callServiceOnHub } from "@/lib/webhook";
import { useHaStore } from "@/store/ha-store";

import { sendWidgetServiceCall } from "./deliver";
import { serviceCallForTarget } from "./types";

export { targetFromWidgetEvent } from "./types";

export function dispatchWidgetTarget(target: unknown): void {
  const { callService, entities } = useHaStore.getState();
  const call = serviceCallForTarget(target, entities);
  if (!call) return;
  hapticToggle();
  void sendWidgetServiceCall(call, {
    callService,
    callViaWebhook: async (next) => {
      const result = await callServiceOnHub({
        domain: next.domain,
        service: next.service,
        serviceData: { entity_id: next.entityId },
      });
      if (result !== "sent") throw new Error(result);
    },
  }).catch(() => {});
}
