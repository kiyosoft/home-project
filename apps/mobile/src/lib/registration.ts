import {
  isMobileAppLoaded,
  MobileAppError,
  registerMobileApp,
  updateRegistration,
  type MobileAppData,
} from "@ethio/ha-sdk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import {
  APP_ID,
  APP_NAME,
  readDeviceIdentity,
  type DeviceIdentity,
} from "@/lib/device-identity";

/**
 * Our `mobile_app` registration with Home Assistant. The webhook id is a bearer
 * credential in its own right (the webhook endpoint is unauthenticated), so it
 * lives in SecureStore next to the tokens rather than in AsyncStorage.
 */

const REGISTRATION_KEY = "ethio-home.registration:v1";
const WEBHOOK_ID_KEY = "ethio-home.webhook-id.v1";
const SECRET_KEY = "ethio-home.registration-secret.v1";

export interface StoredRegistration {
  webhookId: string;
  secret: string | null;
  /** Guards against a stale registration after the device id is regenerated. */
  deviceId: string;
  appVersion: string;
  deviceName: string;
  /** Null until the user grants notification permission and Phase 3 is wired. */
  pushToken: string | null;
  pushUrl: string | null;
}

interface StoredMeta {
  deviceId: string;
  appVersion: string;
  deviceName: string;
  pushToken: string | null;
  pushUrl: string | null;
}

export async function loadRegistration(): Promise<StoredRegistration | null> {
  try {
    const [raw, webhookId, secret] = await Promise.all([
      AsyncStorage.getItem(REGISTRATION_KEY),
      SecureStore.getItemAsync(WEBHOOK_ID_KEY),
      SecureStore.getItemAsync(SECRET_KEY),
    ]);
    if (!raw || !webhookId) return null;

    const meta = parseMeta(JSON.parse(raw) as unknown);
    if (!meta) return null;

    return { ...meta, webhookId, secret: secret ?? null };
  } catch {
    return null;
  }
}

export async function saveRegistration(
  registration: StoredRegistration,
): Promise<void> {
  const meta: StoredMeta = {
    deviceId: registration.deviceId,
    appVersion: registration.appVersion,
    deviceName: registration.deviceName,
    pushToken: registration.pushToken,
    pushUrl: registration.pushUrl,
  };
  await AsyncStorage.setItem(REGISTRATION_KEY, JSON.stringify(meta));
  await SecureStore.setItemAsync(WEBHOOK_ID_KEY, registration.webhookId);
  if (registration.secret) {
    await SecureStore.setItemAsync(SECRET_KEY, registration.secret);
  } else {
    await SecureStore.deleteItemAsync(SECRET_KEY);
  }
}

export async function clearRegistration(): Promise<void> {
  await AsyncStorage.removeItem(REGISTRATION_KEY);
  await SecureStore.deleteItemAsync(WEBHOOK_ID_KEY);
  await SecureStore.deleteItemAsync(SECRET_KEY);
}

function parseMeta(value: unknown): StoredMeta | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const deviceId = typeof raw.deviceId === "string" ? raw.deviceId : "";
  if (!deviceId) return null;
  return {
    deviceId,
    appVersion: typeof raw.appVersion === "string" ? raw.appVersion : "",
    deviceName: typeof raw.deviceName === "string" ? raw.deviceName : "",
    pushToken: typeof raw.pushToken === "string" ? raw.pushToken : null,
    pushUrl: typeof raw.pushUrl === "string" ? raw.pushUrl : null,
  };
}

function appDataFor(registration: {
  pushToken: string | null;
  pushUrl: string | null;
}): MobileAppData {
  const data: MobileAppData = { pushWebsocketChannel: true };
  if (registration.pushToken && registration.pushUrl) {
    data.pushToken = registration.pushToken;
    data.pushUrl = registration.pushUrl;
  }
  return data;
}

export type RegistrationFailure =
  | "not-loaded"
  | "unauthorized"
  | "unreachable"
  /**
   * Core threw the payload away. Re-registering cannot help, so this
   * deliberately does not take the `not-loaded` recovery path below.
   */
  | "rejected"
  | "unknown";

export type RegistrationResult =
  | { ok: true; registration: StoredRegistration }
  /**
   * `registration` survives a transient failure. Home Assistant still has the
   * device; only this attempt to reach it did not land, and dropping the
   * webhook id would take notifications down with it.
   */
  | {
      ok: false;
      failure: RegistrationFailure;
      registration: StoredRegistration | null;
    };

function toFailure(error: unknown): RegistrationFailure {
  if (error instanceof MobileAppError) return error.kind;
  return "unknown";
}

/**
 * Register on connect, never gated on notification permission: the webhook this
 * returns is also how we fire events and call services, so a user who declines
 * banners still needs a device in Home Assistant.
 */
export async function ensureRegistration(options: {
  baseUrl: string;
  accessToken: string;
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>;
}): Promise<RegistrationResult> {
  const identity = await readDeviceIdentity();
  const existing = await loadRegistration();

  if (existing && existing.deviceId === identity.deviceId) {
    // Sent on every connect, not just when something changed: an update is the
    // only request that tells us whether Home Assistant still has this device.
    try {
      await updateRegistration({
        baseUrl: options.baseUrl,
        webhookId: existing.webhookId,
        update: {
          appVersion: identity.appVersion,
          deviceName: identity.deviceName,
          manufacturer: identity.manufacturer,
          model: identity.model,
          osVersion: identity.osVersion,
          appData: appDataFor(existing),
        },
      });
      if (
        existing.appVersion === identity.appVersion &&
        existing.deviceName === identity.deviceName
      ) {
        return { ok: true, registration: existing };
      }
      const refreshed: StoredRegistration = {
        ...existing,
        appVersion: identity.appVersion,
        deviceName: identity.deviceName,
      };
      await saveRegistration(refreshed);
      return { ok: true, registration: refreshed };
    } catch (error) {
      // Anything other than "HA forgot us" means the network or the instance is
      // unhappy; re-registering would just create a duplicate device.
      const failure = toFailure(error);
      if (failure !== "not-loaded") {
        return { ok: false, failure, registration: existing };
      }
    }
  }

  return createRegistration(options, identity);
}

async function createRegistration(
  options: {
    baseUrl: string;
    accessToken: string;
    sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>;
  },
  identity: DeviceIdentity,
): Promise<RegistrationResult> {
  if (!(await isMobileAppLoaded(options.sendMessagePromise))) {
    return { ok: false, failure: "not-loaded", registration: null };
  }

  try {
    const created = await registerMobileApp({
      baseUrl: options.baseUrl,
      accessToken: options.accessToken,
      request: {
        deviceId: identity.deviceId,
        appId: APP_ID,
        appName: APP_NAME,
        appVersion: identity.appVersion,
        deviceName: identity.deviceName,
        manufacturer: identity.manufacturer,
        model: identity.model,
        osName: identity.osName,
        osVersion: identity.osVersion,
        appData: { pushWebsocketChannel: true },
      },
    });

    const registration: StoredRegistration = {
      webhookId: created.webhookId,
      secret: created.secret,
      deviceId: identity.deviceId,
      appVersion: identity.appVersion,
      deviceName: identity.deviceName,
      pushToken: null,
      pushUrl: null,
    };
    await saveRegistration(registration);
    return { ok: true, registration };
  } catch (error) {
    return { ok: false, failure: toFailure(error), registration: null };
  }
}

/**
 * Sends a push token to Home Assistant. `push_token` and `push_url` are an
 * inclusive pair server-side, and `app_data` is replaced rather than merged, so
 * this always rebuilds the whole object.
 */
export async function syncPushToken(options: {
  baseUrl: string;
  registration: StoredRegistration;
  pushToken: string | null;
  pushUrl: string | null;
  /**
   * Resend even when nothing looks changed. Used when the relay reports that
   * Expo rejected the token, where our copy and Home Assistant's can agree with
   * each other and still both be wrong.
   */
  force?: boolean;
}): Promise<StoredRegistration> {
  const { registration } = options;
  const pushToken = options.pushToken;
  const pushUrl = options.pushUrl;
  if (
    !options.force &&
    registration.pushToken === pushToken &&
    registration.pushUrl === pushUrl
  ) {
    return registration;
  }

  const identity = await readDeviceIdentity();
  await updateRegistration({
    baseUrl: options.baseUrl,
    webhookId: registration.webhookId,
    update: {
      appVersion: identity.appVersion,
      deviceName: identity.deviceName,
      manufacturer: identity.manufacturer,
      model: identity.model,
      osVersion: identity.osVersion,
      appData: appDataFor({ pushToken, pushUrl }),
    },
  });

  const next: StoredRegistration = { ...registration, pushToken, pushUrl };
  await saveRegistration(next);
  return next;
}
