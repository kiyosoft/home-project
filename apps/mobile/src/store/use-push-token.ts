import { MobileAppError } from "@ethio/ha-sdk";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { create } from "zustand";

import { notificationPermission } from "@/lib/notifications";
import { isTokenRejected, readPushRelay } from "@/lib/push-relay";
import {
  fetchPushToken,
  reasonOf,
  type PushTokenFailure,
} from "@/lib/push-token";
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

/**
 * A reason is only meaningful alongside the failure it explains, so the two
 * travel together and a `synced` state has no room to carry a stale one.
 */
export type PushSync =
  | { status: "idle" | "no-relay" | "no-permission" | "syncing" | "synced" }
  | {
      status: "blocked" | "failed";
      failure: PushTokenFailure;
      /** The underlying error, verbatim, when there is one worth reading. */
      detail: string | null;
    };

interface PushSyncState {
  sync: PushSync;
  /**
   * The relay could not deliver with the token we gave it. Separate from `sync`
   * because it is the relay's verdict on a past send rather than the state of
   * our own attempt: both can be true at once, and that combination is exactly
   * what says "we sent a token successfully and it still does not work".
   */
  tokenRejected: boolean;
}

export const usePushSyncStore = create<PushSyncState>(() => ({
  sync: { status: "idle" },
  tokenRejected: false,
}));

function report(sync: PushSync): void {
  usePushSyncStore.setState({ sync });
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
  const relayUrl = useHaStore(
    (state) => readPushRelay(state.entities)?.url ?? "",
  );
  // Asked about the token we actually hold, so another phone's dead token does
  // not make this one throw away a working one.
  const relayRejected = useHaStore((state) =>
    isTokenRejected(readPushRelay(state.entities), registration?.pushToken),
  );

  /**
   * Bumped whenever something outside this effect's inputs could change the
   * answer: the device token rotated, or permission may have been granted from
   * the system settings app.
   *
   * A counter rather than a flag, because the same reason can come round twice
   * — returning from the settings app after a failure, say — and setting a flag
   * that is already set changes nothing, so React would skip the render and the
   * retry would never run.
   */
  const [nonce, setNonce] = useState(0);
  /**
   * The nonce as of the last token Home Assistant accepted. Anything newer
   * means its copy cannot be trusted even where it still looks current. Starts
   * matching so a fresh mount trusts what is already registered instead of
   * asking Expo for a token it does not need.
   */
  const synced = useRef(0);
  // The device token as of our last look. Only a change of value is a rotation.
  const deviceToken = useRef<string | null>(null);
  // Whether we have already spent our one re-registration on this mount.
  const recovered = useRef(false);

  useEffect(() => {
    const bump = () => setNonce((current) => current + 1);

    // Asking for a token is itself what makes this fire, so bumping on every
    // event would re-enter the fetch that caused it and never stop. Expo's own
    // docs are blunt about it: do not call a token getter from this listener.
    const rotation = Notifications.addPushTokenListener((token) => {
      const value =
        typeof token.data === "string" ? token.data : JSON.stringify(token.data);
      const previous = deviceToken.current;
      deviceToken.current = value;
      if (previous !== null && previous !== value) bump();
    });

    const foreground = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      // Coming back from the system settings app is the case worth re-checking.
      // Interrupting a sync that is working, or redoing one that already
      // worked, only costs a round trip to Expo.
      const { status: current } = usePushSyncStore.getState().sync;
      if (current === "no-permission" || current === "failed") bump();
    });

    return () => {
      rotation.remove();
      foreground.remove();
    };
  }, []);

  useEffect(() => {
    usePushSyncStore.setState({ tokenRejected: relayRejected });
  }, [relayRejected]);

  useEffect(() => {
    if (!hasSession(status) || !registration || !activeUrl) {
      report({ status: "idle" });
      return;
    }
    // A momentarily missing entity is not a reason to forget a working token;
    // Home Assistant keeps the one it has and we leave it alone.
    if (!relayUrl) {
      report({ status: "no-relay" });
      return;
    }

    let cancelled = false;

    void (async () => {
      if ((await notificationPermission()) !== "granted") {
        if (!cancelled) report({ status: "no-permission" });
        return;
      }
      if (cancelled) return;

      if (
        !needsSync({
          registration,
          relayUrl,
          rotated: synced.current !== nonce,
          rejected: relayRejected,
        })
      ) {
        report({ status: "synced" });
        return;
      }

      report({ status: "syncing" });
      const result = await fetchPushToken();
      if (cancelled) return;

      if (!result.ok) {
        const blocked =
          result.failure === "simulator" || result.failure === "no-project";
        report({
          status: blocked ? "blocked" : "failed",
          failure: result.failure,
          detail: result.detail ?? null,
        });
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
        synced.current = nonce;
        report({ status: "synced" });
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

        report({
          status: "failed",
          // Distinct from a token we never got: we have one, and Home Assistant
          // would not take it. Same card otherwise, entirely different fix.
          failure: gone ? "no-registration" : "ha-rejected",
          detail: reasonOf(error),
        });
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
    nonce,
  ]);
}
