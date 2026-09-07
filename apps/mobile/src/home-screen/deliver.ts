export type WidgetServiceCall = {
  domain: string;
  service: string;
  entityId: string;
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
    await deps.callService(call.domain, call.service, {
      entity_id: call.entityId,
    });
  } catch {
    await deps.callViaWebhook(call);
  }
}
