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
  /**
   * Core validated the payload and threw it away. Retrying it unchanged and
   * registering again are both pointless; the payload itself is wrong.
   */
  | "rejected"
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

export const NOTIFICATION_IMPORTANCE = [
  "min",
  "low",
  "default",
  "high",
  "max",
] as const;
export type NotificationImportance = (typeof NOTIFICATION_IMPORTANCE)[number];

export const NOTIFICATION_INTERRUPTIONS = [
  "passive",
  "active",
  "time-sensitive",
  "critical",
] as const;
export type NotificationInterruption =
  (typeof NOTIFICATION_INTERRUPTIONS)[number];

export interface NotificationPresentation {
  alert: boolean;
  sound: boolean;
  badge: boolean;
}

export interface MobileAppPushNotification {
  message: string;
  title: string | null;
  /** Echo this back with {@link confirmPush} when present. */
  confirmId: string | null;
  /** Replaces an existing notification with the same tag. */
  tag: string | null;
  /** Android channel name from `data.channel`. */
  channel: string | null;
  /**
   * How loudly Android should treat this. Unspecified payloads stay `high` so
   * existing automations still heads-up the way they did before we honoured
   * the field.
   */
  importance: NotificationImportance;
  /** iOS interruption level from `data.push.interruption-level`. */
  interruption: NotificationInterruption;
  /** Foreground presentation; omitted `presentation_options` means show + sound. */
  presentation: NotificationPresentation;
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
  /** Object for most commands; an array for `update_sensor_states`. */
  data?: unknown;
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

  // A live registration always echoes itself back. Silence means it is gone:
  // the webhook endpoint answers 200 to unknown ids so callers cannot probe
  // for them, so an empty body is the only signal we get.
  if (!isRecord(result)) {
    throw new MobileAppError(
      "not-loaded",
      "Home Assistant no longer knows this registration",
    );
  }

  // `{}` with a 200 is what Core's schema decorator returns when a payload
  // fails validation: it logs server-side and discards the update. A real
  // update echoes back `safe_registration`, which always carries the
  // `app_version` the update schema requires. Taking `{}` for success is how a
  // `push_url` that fails `cv.url` becomes a phone reporting push is on while
  // Home Assistant kept none of it.
  if (typeof result.app_version !== "string") {
    throw new MobileAppError(
      "rejected",
      "Home Assistant rejected the registration update",
    );
  }
}

/** GPS report that Home Assistant turns into this device's `device_tracker`. */
export interface LocationUpdate {
  gps: [latitude: number, longitude: number];
  gpsAccuracy?: number;
  battery?: number;
  speed?: number;
  altitude?: number;
  course?: number;
  verticalAccuracy?: number;
}

export const LOCATION_TRIGGER = {
  zoneEnter: "Zone Enter",
  zoneExit: "Zone Exit",
  appOpen: "App Open",
} as const;
export type LocationTrigger =
  (typeof LOCATION_TRIGGER)[keyof typeof LOCATION_TRIGGER];

/** Companion-style unique_id for why the last location report was sent. */
export const LAST_UPDATE_TRIGGER_ID = "last_update_trigger";

export interface MobileAppSensor {
  uniqueId: string;
  type: "sensor" | "binary_sensor";
  state: string | number | boolean;
  name?: string;
  icon?: string;
  attributes?: Record<string, unknown>;
  deviceClass?: string;
  unitOfMeasurement?: string;
  stateClass?: string;
  entityCategory?: string;
  disabled?: boolean;
}

export function buildLocationPayload(
  update: LocationUpdate,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    gps: [update.gps[0], update.gps[1]],
  };
  if (update.gpsAccuracy !== undefined) data.gps_accuracy = update.gpsAccuracy;
  if (update.battery !== undefined) data.battery = update.battery;
  if (update.speed !== undefined) data.speed = update.speed;
  if (update.altitude !== undefined) data.altitude = update.altitude;
  if (update.course !== undefined) data.course = update.course;
  if (update.verticalAccuracy !== undefined) {
    data.vertical_accuracy = update.verticalAccuracy;
  }
  return data;
}

export function buildSensorRegistration(
  sensor: MobileAppSensor,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    unique_id: sensor.uniqueId,
    type: sensor.type,
    state: sensor.state,
  };
  if (sensor.name) data.name = sensor.name;
  if (sensor.icon) data.icon = sensor.icon;
  if (sensor.attributes) data.attributes = sensor.attributes;
  if (sensor.deviceClass) data.device_class = sensor.deviceClass;
  if (sensor.unitOfMeasurement) {
    data.unit_of_measurement = sensor.unitOfMeasurement;
  }
  if (sensor.stateClass) data.state_class = sensor.stateClass;
  if (sensor.entityCategory) data.entity_category = sensor.entityCategory;
  if (sensor.disabled !== undefined) data.disabled = sensor.disabled;
  return data;
}

export function buildSensorState(sensor: MobileAppSensor): Record<string, unknown> {
  const data: Record<string, unknown> = {
    unique_id: sensor.uniqueId,
    type: sensor.type,
    state: sensor.state,
  };
  if (sensor.icon) data.icon = sensor.icon;
  if (sensor.attributes) data.attributes = sensor.attributes;
  return data;
}

function requireWebhookHandled(result: unknown, type: string): void {
  if (result === null) {
    throw new MobileAppError(
      "not-loaded",
      `Home Assistant has no handler for this ${type}`,
    );
  }
}

/**
 * Report this phone's coordinates. Home Assistant matches them to zones and
 * sets `device_tracker.<device>` to `home` / `not_home` / a zone name.
 */
export async function updateLocation(options: {
  baseUrl: string;
  webhookId: string;
  update: LocationUpdate;
}): Promise<void> {
  const result = await postWebhook({
    baseUrl: options.baseUrl,
    webhookId: options.webhookId,
    type: "update_location",
    data: buildLocationPayload(options.update),
  });
  requireWebhookHandled(result, "update_location");
}

export async function registerSensor(options: {
  baseUrl: string;
  webhookId: string;
  sensor: MobileAppSensor;
}): Promise<void> {
  const result = await postWebhook({
    baseUrl: options.baseUrl,
    webhookId: options.webhookId,
    type: "register_sensor",
    data: buildSensorRegistration(options.sensor),
  });
  requireWebhookHandled(result, "register_sensor");
}

export async function updateSensorStates(options: {
  baseUrl: string;
  webhookId: string;
  sensors: MobileAppSensor[];
}): Promise<void> {
  const result = await postWebhook({
    baseUrl: options.baseUrl,
    webhookId: options.webhookId,
    type: "update_sensor_states",
    data: options.sensors.map(buildSensorState),
  });
  requireWebhookHandled(result, "update_sensor_states");
}

export function lastUpdateTriggerSensor(state: LocationTrigger): MobileAppSensor {
  return {
    uniqueId: LAST_UPDATE_TRIGGER_ID,
    type: "sensor",
    name: "Last Update Trigger",
    icon: "mdi:cellphone-marker",
    state,
  };
}

/**
 * Fire an event on the HA bus, e.g. a notification action the user tapped.
 *
 * Note the asymmetry with `updateRegistration`: `fire_event` answers `{}` on
 * success, so an empty object cannot mean failure here and a discarded payload
 * is indistinguishable from a delivered one. A body that is empty rather than
 * `{}` is different — that is the webhook component answering for an id Home
 * Assistant has no handler for, which no retry will fix.
 */
export async function fireWebhookEvent(options: {
  baseUrl: string;
  webhookId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
}): Promise<void> {
  const result = await postWebhook({
    baseUrl: options.baseUrl,
    webhookId: options.webhookId,
    type: "fire_event",
    data: {
      event_type: options.eventType,
      event_data: options.eventData ?? {},
    },
  });

  if (result === null) {
    throw new MobileAppError(
      "not-loaded",
      "Home Assistant has no handler for this registration",
    );
  }
}

/**
 * Call a Home Assistant service over the mobile_app webhook. Used when the
 * websocket is down — home-screen widget taps land here after the user has
 * left the app.
 */
export async function callServiceViaWebhook(options: {
  baseUrl: string;
  webhookId: string;
  domain: string;
  service: string;
  serviceData?: Record<string, unknown>;
}): Promise<void> {
  const result = await postWebhook({
    baseUrl: options.baseUrl,
    webhookId: options.webhookId,
    type: "call_service",
    data: {
      domain: options.domain,
      service: options.service,
      service_data: options.serviceData ?? {},
    },
  });

  if (result === null) {
    throw new MobileAppError(
      "not-loaded",
      "Home Assistant has no handler for this registration",
    );
  }
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
    channel: asString(data.channel) ?? null,
    importance: parseImportance(data),
    interruption: parseInterruption(data),
    presentation: parsePresentation(data),
    actions: parseActions(data.actions),
    data,
  };
}

function pickLiteral<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  for (const item of allowed) {
    if (item === lower) return item;
  }
  return undefined;
}

function parseImportance(data: Record<string, unknown>): NotificationImportance {
  const named = pickLiteral(asString(data.importance), NOTIFICATION_IMPORTANCE);
  if (named) return named;

  const priority = asString(data.priority)?.toLowerCase();
  if (priority === "max" || priority === "high") return "high";
  if (priority === "low" || priority === "min") return priority;
  return "high";
}

function parseInterruption(
  data: Record<string, unknown>,
): NotificationInterruption {
  const push = isRecord(data.push) ? data.push : null;
  if (!push) return "active";

  const level = pickLiteral(
    asString(push["interruption-level"]),
    NOTIFICATION_INTERRUPTIONS,
  );
  if (level) return level;
  if (isCriticalSound(push.sound)) return "critical";
  return "active";
}

function isCriticalSound(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const critical = value.critical;
  return critical === 1 || critical === true || critical === "1";
}

function parsePresentation(
  data: Record<string, unknown>,
): NotificationPresentation {
  const raw = data.presentation_options;
  if (!Array.isArray(raw)) {
    return { alert: true, sound: true, badge: false };
  }

  const options = new Set<string>();
  for (const entry of raw) {
    if (typeof entry === "string" && entry.trim()) {
      options.add(entry.trim().toLowerCase());
    }
  }
  return {
    alert: options.has("alert"),
    sound: options.has("sound"),
    badge: options.has("badge"),
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
