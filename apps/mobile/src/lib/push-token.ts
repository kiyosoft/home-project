import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

/**
 * The Expo push token, which is what reaches this phone once the app is closed.
 *
 * Notifications arrive over the Home Assistant WebSocket while the app is alive.
 * Nothing of ours is running after that, so a killed app can only be reached
 * through APNs or FCM, and Expo needs a token to address either of them.
 */

/** Why we have no token, when the reason is worth telling the user about. */
export type PushTokenFailure =
  | "simulator"
  | "no-project"
  | "timeout"
  | "unavailable"
  /** We have a token; Home Assistant would not take it. */
  | "ha-rejected"
  /**
   * Home Assistant no longer has the device this token belongs to, and
   * registering it again did not work either.
   */
  | "no-registration";

/**
 * Registering with APNs or FCM is a conversation between the OS and a server we
 * cannot see, and it has no deadline of its own: with no route to Apple or
 * Google, the callback simply never comes. Without this the whole thing would
 * sit on "setting up" until the app is killed.
 */
const REGISTRATION_TIMEOUT_MS = 20_000;

export type PushTokenResult =
  | { ok: true; token: string }
  /**
   * `detail` carries the underlying error verbatim. "Could not get a token" has
   * far too many causes to act on, and on a release build there is no console
   * to read, so the one place it can usefully go is the screen.
   */
  | { ok: false; failure: PushTokenFailure; detail?: string };

export function pushProjectId(): string {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromConfig === "string" && fromConfig) return fromConfig;
  // Set by EAS at build time, and the only source in a bare build where
  // app.json is not bundled.
  return Constants.easConfig?.projectId ?? "";
}

/**
 * Whether asking for a token can possibly work, checked before asking so a
 * predictable "no" does not look like a network failure.
 */
export function pushTokenBlocker(): PushTokenFailure | null {
  // Simulators and emulators have no push service to register with.
  if (!Device.isDevice) return "simulator";
  if (!pushProjectId()) return "no-project";
  return null;
}

/**
 * Asks Expo for a token. This is a network call to `exp.host` and fails
 * independently of Home Assistant, so callers keep whatever they already had
 * rather than treating a failure as "push is off".
 */
export async function fetchPushToken(): Promise<PushTokenResult> {
  const blocker = pushTokenBlocker();
  if (blocker) return { ok: false, failure: blocker };

  const deadline = countdown(REGISTRATION_TIMEOUT_MS);

  try {
    const token = await Promise.race([
      Notifications.getExpoPushTokenAsync({ projectId: pushProjectId() }).then(
        (result) => result.data.trim(),
      ),
      deadline.promise,
    ]);
    if (token === TIMED_OUT) return { ok: false, failure: "timeout" };
    if (!token) return { ok: false, failure: "unavailable" };
    return { ok: true, token };
  } catch (error) {
    // Offline, a credential problem, or Expo being unreachable. All of them
    // resolve themselves on a later attempt.
    return { ok: false, failure: "unavailable", detail: reasonOf(error) };
  } finally {
    deadline.cancel();
  }
}

/**
 * Expo's native module puts its code in the message ("E_PROMISE_REPLACED" and
 * the like), which is the part worth reading, so the message is enough.
 */
export function reasonOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "";
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
