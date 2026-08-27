import { normalizeBaseUrl } from "./base-url";

/**
 * Home Assistant's `mobile_app` integration — the same Native App Integration
 * the official companion apps use. Registering here is what creates the device
 * in Home Assistant, the webhook we send data back through, and the
 * `notify.mobile_app_*` target.
 */

const REGISTRATIONS_PATH = "/api/mobile_app/registrations";
const WEBHOOK_PATH = "/api/webhook";

/**
 * zrok's public frontend answers browser-looking requests with an interstitial
 * HTML page. React Native's HTTP stacks do not send a `Mozilla/5.0` agent, so
 * this is belt and braces, but the failure it prevents (HTML where JSON was
 * expected) is a miserable one to diagnose.
 */
const ZROK_SKIP_INTERSTITIAL = { skip_zrok_interstitial: "1" } as const;

export type MobileAppErrorKind =
  | "not-loaded"
  | "unauthorized"
  | "unreachable"
  | "unknown";

export class MobileAppError extends Error {
  readonly kind: MobileAppErrorKind;

  constructor(kind: MobileAppErrorKind, message: string) {
    super(message);
    this.name = "MobileAppError";
    this.kind = kind;
  }
}

/**
 * Push configuration for a registration.
 *
 * `pushToken` and `pushUrl` are a `vol.Inclusive` pair in core's schema: send
 * both or neither. {@link buildAppData} enforces that.
 */
export interface MobileAppData {
  /** Receive notifications over the WebSocket while the app is alive. */
  pushWebsocketChannel: boolean;
  /** Expo (or native) push token. Requires `pushUrl`. */
  pushToken?: string;
  /** Our relay, which Home Assistant POSTs to. Requires `pushToken`. */
  pushUrl?: string;
}

export interface MobileAppRegistrationRequest {
  deviceId: string;
  appId: string;
  appName: string;
  appVersion: string;
  deviceName: string;
  manufacturer: string;
  model: string;
  osName: string;
  osVersion: string;
  appData: MobileAppData;
}

/** The fields core marks `vol.Required` on `update_registration`, plus push. */
export interface MobileAppUpdateRequest {
  appVersion: string;
  deviceName: string;
  manufacturer: string;
  model: string;
  osVersion?: string;
  appData: MobileAppData;
}

export interface MobileAppRegistration {
  webhookId: string;
  /** Only when both sides support encryption, which we do not use yet. */
  secret: string | null;
  /** Nabu Casa only; null on self-hosted and zrok setups. */
  cloudhookUrl: string | null;
  remoteUiUrl: string | null;
}

export interface MobileAppNotificationAction {
  action: string;
  title: string;
  uri?: string;
}

export interface MobileAppPushNotification {
  message: string;
  title: string | null;
  /** Echo this back with {@link confirmPush} when present. */
  confirmId: string | null;
  /** Replaces an existing notification with the same tag. */
  tag: string | null;
  actions: MobileAppNotificationAction[];
  data: Record<string, unknown>;
}

/** HA's magic message for dismissing a notification rather than showing one. */
export const CLEAR_NOTIFICATION = "clear_notification";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * `app_data` is replaced wholesale on update, not deep-merged: core does
 * `{...config_entry.data, ...data}`. Always send every key we care about, or
 * an update that adds a push token silently turns off the WebSocket channel.
 */
export function buildAppData(data: MobileAppData): Record<string, unknown> {
  const appData: Record<string, unknown> = {
    push_websocket_channel: data.pushWebsocketChannel,
  };
  const token = asString(data.pushToken);
  const url = asString(data.pushUrl);
  if (token && url) {
    appData.push_token = token;
    appData.push_url = url;
  }
  return appData;
}

export function webhookUrl(baseUrl: string, webhookId: string): string {
  return `${normalizeBaseUrl(baseUrl)}${WEBHOOK_PATH}/${webhookId}`;
}

/**
 * `mobile_app` ships inside `default_config`, but an instance with a trimmed
 * configuration can be missing it, and registration then 404s with nothing to
 * explain why. Check first so we can say so.
 */
export async function isMobileAppLoaded(
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
): Promise<boolean> {
  try {
    const config = await sendMessagePromise<{ components?: unknown }>({
      type: "get_config",
    });
    const components = config.components;
    if (!Array.isArray(components)) return true;
    return components.includes("mobile_app");
  } catch {
    // A failed probe should not stop us from trying to register.
    return true;
  }
}

export async function registerMobileApp(options: {
  baseUrl: string;
  accessToken: string;
  request: MobileAppRegistrationRequest;
}): Promise<MobileAppRegistration> {
  const { request } = options;
  const body = {
    device_id: request.deviceId,
    app_id: request.appId,
    app_name: request.appName,
    app_version: request.appVersion,
    device_name: request.deviceName,
    manufacturer: request.manufacturer,
    model: request.model,
    os_name: request.osName,
    os_version: request.osVersion,
    supports_encryption: false,
    app_data: buildAppData(request.appData),
  };

  const response = await post(
    `${normalizeBaseUrl(options.baseUrl)}${REGISTRATIONS_PATH}`,
    body,
    { Authorization: `Bearer ${options.accessToken}` },
  );

  if (response.status === 401 || response.status === 403) {
    throw new MobileAppError(
      "unauthorized",
      `Home Assistant rejected the registration (${response.status})`,
    );
  }
  if (response.status === 404) {
    throw new MobileAppError(
      "not-loaded",
      "The mobile_app integration is not loaded on this Home Assistant",
    );
  }
  if (!response.ok) {
    throw new MobileAppError(
      "unknown",
      `Registration failed with ${response.status}`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new MobileAppError("unknown", "Registration response was not JSON");
  }
  if (!isRecord(payload)) {
    throw new MobileAppError("unknown", "Registration response was not an object");
  }

  const webhookId = asString(payload.webhook_id);
  if (!webhookId) {
    throw new MobileAppError(
      "unknown",
      "Registration response had no webhook_id",
    );
  }

  return {
    webhookId,
    secret: asString(payload.secret) ?? null,
    cloudhookUrl: asString(payload.cloudhook_url) ?? null,
    remoteUiUrl: asString(payload.remote_ui_url) ?? null,
  };
}

/**
 * Every webhook command goes through here. The endpoint is unauthenticated —
 * the webhook id is the credential.
 */
export async function postWebhook(options: {
  baseUrl: string;
  webhookId: string;
  type: string;
  data?: Record<string, unknown>;
}): Promise<unknown> {
  const body: Record<string, unknown> = { type: options.type };
  if (options.data) body.data = options.data;

  const response = await post(
    webhookUrl(options.baseUrl, options.webhookId),
    body,
  );

  // Documented as "integration deleted, register again".
  if (response.status === 410) {
    throw new MobileAppError(
      "not-loaded",
      "Home Assistant deleted this registration",
    );
  }
  if (!response.ok) {
    throw new MobileAppError(
      "unknown",
      `Webhook ${options.type} failed with ${response.status}`,
    );
  }

  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Core marks `app_version`, `device_name`, `manufacturer` and `model` as
 * required here even though the published docs call every field optional.
 *
 * Throws `not-loaded` when Home Assistant has forgotten the registration, which
 * doubles as the only way to detect that: the webhook endpoint deliberately
 * answers 200 to unknown ids so callers cannot probe for them.
 */
export async function updateRegistration(options: {
  baseUrl: string;
  webhookId: string;
  update: MobileAppUpdateRequest;
}): Promise<void> {
  const { update } = options;
  const data: Record<string, unknown> = {
    app_version: update.appVersion,
    device_name: update.deviceName,
    manufacturer: update.manufacturer,
    model: update.model,
    app_data: buildAppData(update.appData),
  };
  if (update.osVersion) data.os_version = update.osVersion;

  const result = await postWebhook({
    baseUrl: options.baseUrl,
    webhookId: options.webhookId,
    type: "update_registration",
    data,
  });

  // A live registration always echoes itself back. Silence means it is gone.
  if (!isRecord(result)) {
    throw new MobileAppError(
      "not-loaded",
      "Home Assistant no longer knows this registration",
    );
  }
}

/** Fire an event on the HA bus, e.g. a notification action the user tapped. */
export async function fireWebhookEvent(options: {
  baseUrl: string;
  webhookId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
}): Promise<void> {
  await postWebhook({
    baseUrl: options.baseUrl,
    webhookId: options.webhookId,
    type: "fire_event",
    data: {
      event_type: options.eventType,
      event_data: options.eventData ?? {},
    },
  });
}

export function parsePushNotification(
  raw: unknown,
): MobileAppPushNotification | null {
  if (!isRecord(raw)) return null;
  const message = asString(raw.message);
  if (!message) return null;

  const data = isRecord(raw.data) ? raw.data : {};

  return {
    message,
    title: asString(raw.title) ?? null,
    confirmId: asString(raw.hass_confirm_id) ?? null,
    tag: asString(data.tag) ?? null,
    actions: parseActions(data.actions),
    data,
  };
}

function parseActions(value: unknown): MobileAppNotificationAction[] {
  if (!Array.isArray(value)) return [];
  const actions: MobileAppNotificationAction[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const action = asString(entry.action);
    if (!action) continue;
    const parsed: MobileAppNotificationAction = {
      action,
      title: asString(entry.title) ?? action,
    };
    const uri = asString(entry.uri);
    if (uri) parsed.uri = uri;
    actions.push(parsed);
  }
  return actions;
}

/**
 * Notifications arrive as events on this subscription for as long as the
 * socket lives. Home Assistant falls back to `push_url` when we do not confirm.
 */
export function subscribePushChannel(
  subscribeMessage: <T>(
    message: Record<string, unknown>,
    onMessage: (result: T) => void,
  ) => Promise<() => void>,
  webhookId: string,
  onNotification: (notification: MobileAppPushNotification) => void,
): Promise<() => void> {
  return subscribeMessage<unknown>(
    {
      type: "mobile_app/push_notification_channel",
      webhook_id: webhookId,
      support_confirm: true,
    },
    (raw) => {
      const notification = parsePushNotification(raw);
      if (notification) onNotification(notification);
    },
  );
}

/**
 * Tells Home Assistant the notification landed. Without this it retries over
 * the cloud path, so the user gets the same message twice.
 */
export async function confirmPush(
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
  webhookId: string,
  confirmId: string,
): Promise<void> {
  await sendMessagePromise<unknown>({
    type: "mobile_app/push_notification_confirm",
    webhook_id: webhookId,
    confirm_id: confirmId,
  });
}

async function post(
  url: string,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...ZROK_SKIP_INTERSTITIAL,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new MobileAppError(
      "unreachable",
      error instanceof Error ? error.message : "Request failed",
    );
  }
}
