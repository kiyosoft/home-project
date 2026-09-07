import { callServiceViaWebhook, fireWebhookEvent } from "@ethio/ha-sdk";

import { orderedCandidates } from "@/lib/select-url";
import { useHaStore } from "@/store/ha-store";

/**
 * There is no cloudhook to fall back on without Home Assistant Cloud, so the
 * webhook goes to whichever address is winning right now: the live socket's
 * address first, then the usual internal/external ordering.
 */
async function webhookTargets(): Promise<string[]> {
  const { activeUrl, profile } = useHaStore.getState();
  const candidates = await orderedCandidates(profile);
  const urls = [activeUrl, ...candidates.map((entry) => entry.url)];
  return [...new Set(urls.filter(Boolean))];
}

/**
 * Whether the tap reached Home Assistant. A silent failure here means an
 * automation the user believes they triggered never ran, so the caller gets to
 * decide whether that is worth surfacing.
 */
export type ActionDelivery = "sent" | "no-registration" | "unreachable";

export async function fireNotificationAction(options: {
  action: string;
  tag: string | null;
  replyText?: string;
  actionData?: Record<string, unknown>;
}): Promise<ActionDelivery> {
  const { registration } = useHaStore.getState();
  if (!registration) return "no-registration";

  const eventData: Record<string, unknown> = { action: options.action };
  if (options.tag) eventData.tag = options.tag;
  if (options.replyText) eventData.reply_text = options.replyText;
  if (options.actionData) eventData.action_data = options.actionData;

  for (const baseUrl of await webhookTargets()) {
    try {
      await fireWebhookEvent({
        baseUrl,
        webhookId: registration.webhookId,
        eventType: "mobile_app_notification_action",
        eventData,
      });
      return "sent";
    } catch {
      // Try the next address; the phone may have moved between networks.
    }
  }
  return "unreachable";
}

/**
 * Widget taps land here when the websocket is already dead (the usual case
 * once the user has left the app for the Home Screen).
 */
export async function callServiceOnHub(options: {
  domain: string;
  service: string;
  serviceData?: Record<string, unknown>;
}): Promise<ActionDelivery> {
  const { registration } = useHaStore.getState();
  if (!registration) return "no-registration";

  for (const baseUrl of await webhookTargets()) {
    try {
      await callServiceViaWebhook({
        baseUrl,
        webhookId: registration.webhookId,
        domain: options.domain,
        service: options.service,
        serviceData: options.serviceData,
      });
      return "sent";
    } catch {
      // Try the next address; the phone may have moved between networks.
    }
  }
  return "unreachable";
}
