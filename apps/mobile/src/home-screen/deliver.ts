import type { ActionDelivery } from "@/lib/webhook";

export type WidgetServiceCall = {
  domain: string;
  service: string;
  entityId: string;
  serviceData?: Record<string, unknown>;
};

/**
 * Prefer the live socket; when the user is on the Home Screen that socket is
 * often already gone, so fall through to the mobile_app webhook.
 */
export async function sendWidgetServiceCall(
  call: WidgetServiceCall,
  deps: {
    callService: (
      domain: string,
      service: string,
      data: Record<string, unknown>,
    ) => Promise<void>;
    callViaWebhook: (call: WidgetServiceCall) => Promise<void>;
  },
): Promise<void> {
  try {
    await deps.callService(
      call.domain,
      call.service,
      call.serviceData ?? { entity_id: call.entityId },
    );
  } catch {
    await deps.callViaWebhook(call);
  }
}

/**
 * Widget taps often land after the socket is dead. A missing registration is
 * recoverable; an unreachable hub is not treated as success.
 */
export async function deliverWidgetWebhook(
  call: WidgetServiceCall,
  deps: {
    send: (call: WidgetServiceCall) => Promise<ActionDelivery>;
    recoverRegistration: () => Promise<unknown>;
  },
): Promise<void> {
  let result = await deps.send(call);
  if (result === "no-registration") {
    await deps.recoverRegistration();
    result = await deps.send(call);
  }
  if (result !== "sent") throw new Error(result);
}
