import { serviceCallForTarget } from "./types";

/** App Group UserDefaults key the widget extension reads on tap. */
export const WIDGET_HUB_KEY = "ethio-home.widget-hub.v1";

export interface WidgetHubConfig {
  webhookId: string;
  urls: string[];
}

export function encodeWidgetHub(config: WidgetHubConfig): string {
  return JSON.stringify({
    webhookId: config.webhookId,
    urls: config.urls.filter(Boolean),
  });
}

export function parseWidgetHub(raw: unknown): WidgetHubConfig | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const webhookId =
      typeof record.webhookId === "string" ? record.webhookId : "";
    const urls = Array.isArray(record.urls)
      ? record.urls.filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.length > 0,
        )
      : [];
    if (!webhookId || urls.length === 0) return null;
    return { webhookId, urls };
  } catch {
    return null;
  }
}

export function webhookBodyForTarget(
  target: string,
): Record<string, unknown> | null {
  const call = serviceCallForTarget(target, {});
  if (!call) return null;
  return {
    type: "call_service",
    data: {
      domain: call.domain,
      service: call.service,
      service_data: call.serviceData ?? { entity_id: call.entityId },
    },
  };
}
