import { MobileAppError } from "@ethio/ha-sdk";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { create } from "zustand";

import { notificationPermission } from "@/lib/notifications";
import {
  fetchPushToken,
  isPushTokenRejected,
  pushRelayUrl,
} from "@/lib/push";
import { syncPushToken, type StoredRegistration } from "@/lib/registration";
import { hasSession, useHaStore } from "@/store/ha-store";

/**
 * Keeping Home Assistant's registration pointed at a live Expo push token.
 *
 * Notifications reach a running app over the WebSocket channel, so none of this
 * is needed to see one arrive while you are looking at the phone. It is only for
 * the killed-app case: Core falls back to POSTing the payload at the
 * registration's `push_url`, which is the relay in the Et Remote Access add-on.
 * No relay means no URL to register, so we stay quiet rather than pretending.
 */

const usePushTick = create<{ tick: number }>(() => ({ tick: 0 }));

/** Token rotation, returning from Settings, or a just-granted permission. */
export function retryPushSync(): void {
  usePushTick.setState((state) => ({ tick: state.tick + 1 }));
}

/**
 * What this attempt should do, given what Home Assistant already holds.
 *
 * Split out so the decision can be read on its own: the effect below is
 * plumbing, and everything subtle about when a resend is actually needed lives
 * here.
 */
function needsSync(state: {
  registration: StoredRegistration;
  relayUrl: string;
  rotated: boolean;
  rejected: boolean;
}): boolean {
  // A token we know to be stale, or one the relay could not deliver to, has to
  // go again even though our copy and Home Assistant's agree with each other.
  if (state.rotated || state.rejected) return true;
  return (
    !state.registration.pushToken || state.registration.pushUrl !== state.relayUrl
  );
}

export function usePushToken(): void {
  const status = useHaStore((state) => state.status);
  const activeUrl = useHaStore((state) => state.activeUrl);
  const registration = useHaStore((state) => state.registration);
  const setRegistration = useHaStore((state) => state.setRegistration);
  const recoverRegistration = useHaStore((state) => state.recoverRegistration);

  // Selecting the fields rather than the object keeps this from re-rendering on
  // every unrelated entity update.
  const relayUrl = useHaStore((state) => pushRelayUrl(state.entities) ?? "");
  // Asked about the token we actually hold, so another phone's dead token does
  // not make this one throw away a working one.
  const relayRejected = useHaStore((state) =>
    isPushTokenRejected(state.entities, registration?.pushToken),
  );

  const tick = usePushTick((state) => state.tick);
  /**
   * The tick as of the last token Home Assistant accepted. Anything newer
   * means its copy cannot be trusted even where it still looks current. Starts
   * matching so a fresh mount trusts what is already registered instead of
   * asking Expo for a token it does not need.
   */
  const synced = useRef(0);
  // The device token as of our last look. Only a change of value is a rotation.
  const deviceToken = useRef<string | null>(null);
  // Whether we have already spent our one re-registration on this mount.
  const recovered = useRef(false);
  // Retry when the app comes back: permission may have been granted in Settings,
  // or a transient Expo / Home Assistant failure may have cleared.
  const retryOnForeground = useRef(false);

  useEffect(() => {
    // Asking for a token is itself what makes this fire, so bumping on every
    // event would re-enter the fetch that caused it and never stop. Expo's own
    // docs are blunt about it: do not call a token getter from this listener.
    const rotation = Notifications.addPushTokenListener((token) => {
      const value =
        typeof token.data === "string" ? token.data : JSON.stringify(token.data);
      const previous = deviceToken.current;
      deviceToken.current = value;
      if (previous !== null && previous !== value) retryPushSync();
    });

    const foreground = AppState.addEventListener("change", (next) => {
      if (next === "active" && retryOnForeground.current) retryPushSync();
    });

    return () => {
      rotation.remove();
      foreground.remove();
    };
  }, []);

  useEffect(() => {
    if (!hasSession(status) || !registration || !activeUrl) return;
    // A momentarily missing entity is not a reason to forget a working token;
    // Home Assistant keeps the one it has and we leave it alone.
    if (!relayUrl) return;

    let cancelled = false;

    void (async () => {
      if ((await notificationPermission()) !== "granted") {
        if (!cancelled) retryOnForeground.current = true;
        return;
      }
      if (cancelled) return;

      if (
        !needsSync({
          registration,
          relayUrl,
          rotated: synced.current !== tick,
          rejected: relayRejected,
        })
      ) {
        retryOnForeground.current = false;
        return;
      }

      const result = await fetchPushToken();
      if (cancelled) return;

      if (!result.ok) {
        const blocked =
          result.failure === "simulator" || result.failure === "no-project";
        retryOnForeground.current = !blocked;
        return;
      }

      try {
        const next = await syncPushToken({
          baseUrl: activeUrl,
          registration,
          pushToken: result.token,
          pushUrl: relayUrl,
          force: relayRejected,
        });
        if (cancelled) return;
        // Comparing values, not identity: a forced resend hands back a new
        // object even when nothing moved, and storing it would re-run this.
        if (
          next.pushToken !== registration.pushToken ||
          next.pushUrl !== registration.pushUrl
        ) {
          setRegistration(next);
        }
        // Only now, so an attempt cut short by a reconnect is retried rather
        // than mistaken for a token Home Assistant already has.
        synced.current = tick;
        retryOnForeground.current = false;
      } catch (error) {
        if (cancelled) return;

        // Home Assistant has forgotten the device, so there is no webhook left
        // to send a token to. Registering again is the only fix and nothing
        // else will do it before the next reconnect.
        const gone =
          error instanceof MobileAppError && error.kind === "not-loaded";
        if (gone && !recovered.current) {
          // Once per mount. A recovery that lands but whose token still will
          // not stick would otherwise register this phone over and over.
          recovered.current = true;
          const next = await recoverRegistration();
          if (cancelled) return;
          // A new registration re-runs this effect, which resends the token.
          if (next) return;
        }

        retryOnForeground.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    status,
    activeUrl,
    registration,
    setRegistration,
    recoverRegistration,
    relayUrl,
    relayRejected,
    tick,
  ]);
}
