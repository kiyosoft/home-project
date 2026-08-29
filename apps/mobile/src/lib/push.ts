import type { HassEntities } from "@ethio/ha-sdk";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

/**
 * Closed-app push. While the app is open, Home Assistant uses the WebSocket
 * (`use-notify-session`). Once it is killed, Core POSTs to a `push_url` on the
 * device registration. That URL is the Et Remote Access add-on, which forwards
 * to Expo, then APNs or FCM.
 *
 * This file is the app's half of that path: ask Expo for a token, and read the
 * add-on's address off `sensor.ethio_home_push_relay` (the add-on publishes it
 * because Home Assistant will not tell us the add-on's URL any other way).
 */

const RELAY_ENTITY = "sensor.ethio_home_push_relay";
/** Older add-ons set this instead of listing which tokens Expo refused. */
const RELAY_TOKEN_INVALID = "token_invalid";
/** Last characters of a token, matching `FINGERPRINT_CHARS` in the add-on. */
const TOKEN_FINGERPRINT = 8;
const TOKEN_TIMEOUT_MS = 20_000;

type PushTokenFailure = "simulator" | "no-project" | "timeout" | "unavailable";

export type PushTokenResult =
  | { ok: true; token: string }
  | { ok: false; failure: PushTokenFailure };

type Relay = {
  url: string;
  /**
   * Fingerprints the add-on saw Expo refuse. `"any"` means an older add-on that
   * cannot name the token, so we have to assume it is ours.
   */
  invalid: string[] | "any";
};

export function pushRelayUrl(entities: HassEntities): string | null {
  return readRelay(entities)?.url ?? null;
}

export function isPushTokenRejected(
  entities: HassEntities,
  token: string | null | undefined,
): boolean {
  const relay = readRelay(entities);
  if (!relay) return false;
  if (relay.invalid === "any") return true;
  if (!token) return false;
  return relay.invalid.includes(token.trim().slice(-TOKEN_FINGERPRINT));
}

function readRelay(entities: HassEntities): Relay | null {
  const entity = entities[RELAY_ENTITY];
  if (!entity) return null;

  const raw = entity.attributes?.push_url;
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  // Home Assistant rejects the whole registration if `push_url` is not a URL.
  if (!/^https?:\/\/\S+$/i.test(url)) return null;

  const listed = entity.attributes?.invalid_push_tokens;
  const invalid = Array.isArray(listed)
    ? listed.filter((value): value is string => typeof value === "string")
    : entity.state === RELAY_TOKEN_INVALID
      ? "any"
      : [];

  return { url, invalid };
}

export async function fetchPushToken(): Promise<PushTokenResult> {
  if (!Device.isDevice) return { ok: false, failure: "simulator" };
  const projectId = pushProjectId();
  if (!projectId) return { ok: false, failure: "no-project" };

  const deadline = countdown(TOKEN_TIMEOUT_MS);
  try {
    const token = await Promise.race([
      Notifications.getExpoPushTokenAsync({ projectId }).then((result) =>
        result.data.trim(),
      ),
      deadline.promise,
    ]);
    if (token === TIMED_OUT) return { ok: false, failure: "timeout" };
    if (!token) return { ok: false, failure: "unavailable" };
    return { ok: true, token };
  } catch {
    return { ok: false, failure: "unavailable" };
  } finally {
    deadline.cancel();
  }
}

function pushProjectId(): string {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromConfig === "string" && fromConfig) return fromConfig;
  return Constants.easConfig?.projectId ?? "";
}

const TIMED_OUT = Symbol("timed-out");

function countdown(ms: number): {
  promise: Promise<typeof TIMED_OUT>;
  cancel: () => void;
} {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<typeof TIMED_OUT>((resolve) => {
    handle = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  return { promise, cancel: () => clearTimeout(handle) };
}
