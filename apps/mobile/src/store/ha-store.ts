import {
  connectDemo,
  connectLive,
  connectLiveWithTokens,
  EMPTY_AREA_INDEX,
  fetchAreaIndex,
  getHassConfig,
  revokeTokens,
  type AreaRegistryEntry,
  type ConnectionStatus,
  type EntityClient,
  type HassEntities,
} from "@ethio/ha-sdk";
import { create } from "zustand";

import {
  classifyConnectError,
  type ConnectFailure,
} from "@/lib/connection-error";
import { loginWithHomeAssistant, type LoginFailure } from "@/lib/ha-auth";
import {
  clearRegistration,
  ensureRegistration,
  loadRegistration,
  type StoredRegistration,
} from "@/lib/registration";
import { orderedCandidates } from "@/lib/select-url";
import {
  clearConnectionSettings,
  defaultProfile,
  loadConnectionSettings,
  saveConnectionSettings,
  saveTokens,
  type AuthMode,
  type ConnectionMode,
  type ConnectionProfile,
  type ConnectionSettings,
} from "@/lib/settings";
import { trimTrailingSlash } from "@/lib/url";

export type AddressSlot = "internal" | "external";

/**
 * Whether there are credentials to connect with, which is a separate question
 * from whether the socket is up. Only this decides between the dashboard and
 * the sign-in screen, so a hub that is merely unreachable never costs a login.
 */
export type SessionState = "unknown" | "active" | "signed-out";

interface HaState {
  entities: HassEntities;
  /** Empty until the area registry resolves. */
  areas: AreaRegistryEntry[];
  areaByEntity: Record<string, string>;
  status: ConnectionStatus;
  failure: ConnectFailure | null;
  session: SessionState;
  mode: ConnectionMode | null;
  authMode: AuthMode;
  profile: ConnectionProfile;
  /** The address the live socket is on. */
  activeUrl: string;
  /** False until saved credentials have been read off disk. */
  hydrated: boolean;
  /** Our `mobile_app` registration. Null in demo mode and before it lands. */
  registration: StoredRegistration | null;
  setRegistration: (registration: StoredRegistration) => void;
  /**
   * Home Assistant forgot this device while the session was up. Only a fresh
   * registration fixes that, and nothing else triggers one until the next
   * reconnect, so callers who discover a dead webhook come here.
   */
  recoverRegistration: () => Promise<StoredRegistration | null>;
  login: (baseUrl: string, slot?: AddressSlot) => Promise<void>;
  connectWithToken: (
    baseUrl: string,
    token: string,
    slot?: AddressSlot,
  ) => Promise<void>;
  connect: () => Promise<void>;
  /** New socket to the current address. False when there is no client to refresh. */
  forceReconnect: () => boolean;
  connectDemo: () => Promise<void>;
  saveProfile: (patch: Partial<ConnectionProfile>) => Promise<void>;
  disconnect: (options?: { clearSaved?: boolean }) => void;
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => Promise<void>;
  sendMessagePromise: <T = unknown>(
    message: Record<string, unknown>,
  ) => Promise<T>;
  subscribeMessage: <T = unknown>(
    message: Record<string, unknown>,
    onMessage: (result: T) => void,
  ) => Promise<() => void>;
  sendBinary: (data: ArrayBuffer | Uint8Array) => void;
  ping: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

/** The socket is usable, so live subscriptions and registration can run. */
export function hasSession(status: ConnectionStatus): boolean {
  return status === "connected" || status === "reconnecting";
}

let client: EntityClient | null = null;
let unsubscribe: (() => void) | null = null;
let unsubscribeStatus: (() => void) | null = null;
let saved: ConnectionSettings | null = null;

/**
 * Home Assistant refused the grant itself, or there was never one to refuse.
 * Set by {@link openClient} and reset per attempt, because `auth_invalid` from a
 * reverse proxy or a captive portal arrives as the same error and must not end
 * a session that a later retry would recover.
 */
let grantRefused = false;

/** Long enough for a slow tunnel, short enough to fail over while the user waits. */
const CANDIDATE_TIMEOUT_MS = 10000;

class TimeoutError extends Error {}

function cleanupClient() {
  unsubscribe?.();
  unsubscribe = null;
  unsubscribeStatus?.();
  unsubscribeStatus = null;
  client?.disconnect();
  client = null;
}

function attachClient(
  next: EntityClient,
  set: (partial: Partial<HaState>) => void,
  baseUrl: string,
) {
  cleanupClient();
  client = next;
  unsubscribe = next.subscribeEntities((entities) => {
    // Shallow-copy the map so identity changes (HA often mutates in place).
    // Entity objects stay shared so per-id selectors can skip unrelated tiles.
    set({ entities: { ...entities }, status: "connected", failure: null });
  });
  unsubscribeStatus = next.onStatusChange((status) => {
    if (client !== next) return;
    if (status !== "error") {
      set({ status, failure: null });
      return;
    }
    // The library only reports this for a rejected auth, so the address is
    // fine. The last known entities stay on screen while the retry runs.
    cleanupClient();
    const authMode = saved?.authMode ?? "oauth";
    const failure: ConnectFailure =
      authMode === "oauth"
        ? { kind: "signed-out" }
        : { kind: "token-rejected" };
    set({ status: "error", failure });
    if (endsSession(authMode, failure)) set({ session: "signed-out" });
  });
  // Scoped to "since the last good connection", so the status handler above
  // cannot act on a refusal from some earlier address that has since worked.
  grantRefused = false;
  set({ status: "connected", failure: null });
  void loadAreas(next, set);
  void adoptAddresses(next, set);
  if (baseUrl) void registerDevice(next, set, baseUrl);
}

/**
 * Only Home Assistant refusing the grant ends a session. Anything else leaves
 * the credentials in place so the backoff retry can recover on its own.
 */
function endsSession(authMode: AuthMode, failure: ConnectFailure): boolean {
  if (authMode === "token") return failure.kind === "token-rejected";
  return failure.kind === "signed-out" && grantRefused;
}

/**
 * Something rejected our access token without the refresh token being tried, so
 * whether the grant is dead is still an open question. Expiring the access token
 * forces the next attempt through the refresh, which answers it outright instead
 * of leaving the session in limbo until the token lapses on its own.
 */
async function settleAmbiguousAuth(
  failure: ConnectFailure,
  settings: ConnectionSettings,
) {
  if (failure.kind !== "signed-out" || grantRefused) return;
  if (!settings.tokens || settings.tokens.expires === 0) return;

  const tokens = { ...settings.tokens, expires: 0 };
  if (saved) saved.tokens = tokens;
  await saveTokens(tokens);
}

/**
 * Registration is what gives Home Assistant a `notify.mobile_app_*` target for
 * this phone. It is best-effort: an instance without `mobile_app` loaded still
 * gets a working dashboard, just no notifications.
 */
async function registerDevice(
  target: EntityClient,
  set: (partial: Partial<HaState>) => void,
  baseUrl: string,
): Promise<StoredRegistration | null> {
  const settings = saved;
  if (!settings || settings.mode !== "live") return null;

  const accessToken =
    settings.authMode === "oauth"
      ? (settings.tokens?.accessToken ?? "")
      : settings.token;
  if (!accessToken) return null;

  const result = await ensureRegistration({
    baseUrl,
    accessToken,
    sendMessagePromise: (message) => target.sendMessagePromise(message),
  });

  // A reconnect may have swapped the client while this was in flight.
  if (client !== target) return null;
  set({ registration: result.registration });
  return result.ok ? result.registration : null;
}

/**
 * Shared so that two callers noticing the same dead webhook do not race each
 * other into two registrations, which is how a phone ends up listed in Home
 * Assistant several times over.
 */
let recovery: Promise<StoredRegistration | null> | null = null;

/**
 * Registry reads need an admin token. A non-admin still gets a working dashboard,
 * minus the area sections, so a failure here must not break the connection.
 */
async function loadAreas(
  target: EntityClient,
  set: (partial: Partial<HaState>) => void,
) {
  try {
    const index = await fetchAreaIndex(target);
    // A reconnect may have swapped the client while this was in flight.
    if (client !== target) return;
    set({ areas: index.areas, areaByEntity: index.areaByEntity });
  } catch {
    if (client !== target) return;
    set({ areas: EMPTY_AREA_INDEX.areas, areaByEntity: EMPTY_AREA_INDEX.areaByEntity });
  }
}

function openClient(
  url: string,
  settings: ConnectionSettings,
): Promise<EntityClient> {
  if (settings.authMode === "token") {
    return connectLive({ baseUrl: url, token: settings.token });
  }
  if (!settings.tokens) {
    grantRefused = true;
    return Promise.reject(new SignedOutError());
  }
  return connectLiveWithTokens({
    baseUrl: url,
    tokens: settings.tokens,
    onTokens: (next) => {
      if (saved) saved.tokens = next;
      void saveTokens(next);
    },
    onInvalidGrant: () => {
      grantRefused = true;
    },
  });
}

/**
 * Neither the websocket nor the token request carries a timeout of its own, so
 * an unroutable address would otherwise hold the whole attempt until the OS
 * gives up on the handshake — a minute or more on iOS.
 */
async function openWithTimeout(
  url: string,
  settings: ConnectionSettings,
): Promise<EntityClient> {
  const attempt = openClient(url, settings);
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  // A socket that lands after we gave up would otherwise stay open forever.
  void attempt.then(
    (late) => {
      if (timedOut) late.disconnect();
    },
    () => {},
  );

  try {
    return await Promise.race([
      attempt,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new TimeoutError(`No answer from ${url}`));
        }, CANDIDATE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Distinguished from a rejected token: there is nothing to reject. */
class SignedOutError extends Error {}

function toFailure(error: unknown, authMode: AuthMode): ConnectFailure {
  if (error instanceof SignedOutError) return { kind: "signed-out" };
  if (error instanceof TimeoutError) return { kind: "unreachable" };

  const failure = classifyConnectError(error);
  // An OAuth session has no token field to blame; the grant is the suspect.
  if (failure.kind === "token-rejected" && authMode === "oauth") {
    return { kind: "signed-out" };
  }
  return failure;
}

const LOGIN_FAILURES: Record<
  Exclude<LoginFailure, "cancelled">,
  ConnectFailure
> = {
  unreachable: { kind: "unreachable" },
  rejected: { kind: "signed-out" },
  "no-client-id": { kind: "signin-unavailable" },
  unknown: { kind: "unknown" },
};

async function adoptInstanceAddresses(
  target: EntityClient,
  profile: ConnectionProfile,
): Promise<Partial<ConnectionProfile>> {
  try {
    const config = await getHassConfig((message) =>
      target.sendMessagePromise(message),
    );
    const patch: Partial<ConnectionProfile> = {};
    if (!profile.internalUrl && config.internal_url) {
      patch.internalUrl = trimTrailingSlash(config.internal_url);
    }
    if (!profile.externalUrl && config.external_url) {
      patch.externalUrl = trimTrailingSlash(config.external_url);
    }
    if (!profile.instanceName && config.location_name) {
      patch.instanceName = config.location_name;
    }
    return patch;
  } catch {
    return {};
  }
}

/**
 * Runs on every connect, not just the first: an instance that gains an
 * `external_url` later is how a phone that only ever connected at home learns
 * the address to use once it leaves.
 */
async function adoptAddresses(
  target: EntityClient,
  set: (partial: Partial<HaState>) => void,
) {
  const settings = saved;
  if (!settings || settings.mode !== "live") return;

  const patch = await adoptInstanceAddresses(target, settings.profile);
  if (Object.keys(patch).length === 0) return;
  if (client !== target || saved !== settings) return;

  const profile = { ...settings.profile, ...patch };
  saved = { ...settings, profile };
  await saveConnectionSettings(saved);
  set({ profile });
}

export const useHaStore = create<HaState>((set, get) => ({
  entities: {},
  areas: [],
  areaByEntity: {},
  status: "idle",
  failure: null,
  session: "unknown",
  mode: null,
  authMode: "oauth",
  profile: defaultProfile,
  activeUrl: "",
  hydrated: false,
  registration: null,

  setRegistration(registration) {
    set({ registration });
  },

  recoverRegistration() {
    if (recovery) return recovery;
    const target = client;
    const baseUrl = get().activeUrl;
    if (!target || !baseUrl) return Promise.resolve(null);

    recovery = (async () => {
      try {
        // Dropping the local copy first: we already know the webhook is dead,
        // so the update `ensureRegistration` would try is a wasted round trip,
        // and leaving it on disk risks another caller using it meanwhile.
        await clearRegistration();
        set({ registration: null });
        return await registerDevice(target, set, baseUrl);
      } finally {
        recovery = null;
      }
    })();
    return recovery;
  },

  async login(baseUrl, slot = "external") {
    const address = trimTrailingSlash(baseUrl);
    set({ status: "connecting", failure: null, mode: "live" });

    const result = await loginWithHomeAssistant(address);
    if (!result.ok) {
      if (result.failure === "cancelled") {
        set({ status: "idle", failure: null, mode: null });
        return;
      }
      set({ status: "error", failure: LOGIN_FAILURES[result.failure] });
      return;
    }

    await beginLive(
      {
        mode: "live",
        authMode: "oauth",
        profile: withAddress(get().profile, address, slot),
        token: "",
        tokens: result.tokens,
      },
      address,
      set,
    );
  },

  async connectWithToken(baseUrl, token, slot = "external") {
    const address = trimTrailingSlash(baseUrl);
    await beginLive(
      {
        mode: "live",
        authMode: "token",
        profile: withAddress(get().profile, address, slot),
        token,
        tokens: null,
      },
      address,
      set,
    );
  },

  async connect() {
    const settings = saved;
    if (!settings || settings.mode !== "live") return;

    grantRefused = false;
    set({
      status: "connecting",
      failure: null,
      mode: "live",
      authMode: settings.authMode,
      profile: settings.profile,
    });

    const candidates = await orderedCandidates(settings.profile);
    if (candidates.length === 0) {
      cleanupClient();
      set({ status: "error", failure: { kind: "no-address" } });
      return;
    }

    const failures: ConnectFailure[] = [];
    for (const candidate of candidates) {
      try {
        const next = await openWithTimeout(candidate.url, settings);
        set({ activeUrl: candidate.url });
        attachClient(next, set, candidate.url);
        return;
      } catch (error) {
        failures.push(toFailure(error, settings.authMode));
      }
    }

    // A hub that answered and turned us away says more than one that never
    // answered, so it wins the message even if it was not the last to fail.
    const failure =
      failures.find((entry) => entry.kind !== "unreachable") ?? failures[0]!;

    // Entities and the last good address are left alone: the dashboard keeps
    // showing what it last knew instead of emptying out.
    cleanupClient();
    set({ status: "error", failure });
    if (endsSession(settings.authMode, failure)) {
      set({ session: "signed-out" });
      return;
    }
    await settleAmbiguousAuth(failure, settings);
  },

  forceReconnect() {
    if (!client) return false;
    client.reconnect();
    set({ status: "reconnecting", failure: null });
    return true;
  },

  async connectDemo() {
    set({ status: "connecting", failure: null, mode: "demo", activeUrl: "" });
    try {
      const next = connectDemo();
      saved = {
        mode: "demo",
        authMode: "token",
        profile: defaultProfile,
        token: "",
        tokens: null,
      };
      await saveConnectionSettings(saved);
      set({ profile: defaultProfile, registration: null, session: "active" });
      attachClient(next, set, "");
    } catch (error) {
      cleanupClient();
      set({
        status: "error",
        failure: toFailure(error, "token"),
        entities: {},
        areas: [],
        areaByEntity: {},
        mode: "demo",
        activeUrl: "",
      });
    }
  },

  async saveProfile(patch) {
    const profile = { ...get().profile, ...patch };
    set({ profile });
    if (!saved) return;
    saved = { ...saved, profile };
    await saveConnectionSettings(saved);
  },

  disconnect(options) {
    const previous = saved;
    const revokeUrl = get().activeUrl || previous?.profile.externalUrl;
    cleanupClient();
    if (options?.clearSaved) {
      if (previous?.tokens && revokeUrl) {
        void revokeTokens({
          baseUrl: revokeUrl,
          refreshToken: previous.tokens.refreshToken,
        });
      }
      void clearConnectionSettings();
      // The device stays in Home Assistant so the user can see and remove it
      // there; we only forget our side of the registration.
      void clearRegistration();
      saved = null;
    }
    set({
      entities: {},
      areas: [],
      areaByEntity: {},
      status: "idle",
      failure: null,
      mode: null,
      activeUrl: "",
      session: options?.clearSaved ? "signed-out" : get().session,
      profile: options?.clearSaved ? defaultProfile : get().profile,
      registration: options?.clearSaved ? null : get().registration,
    });
  },

  async callService(domain, service, serviceData) {
    if (!client) {
      throw new Error("Not connected");
    }
    await client.callService(domain, service, serviceData);
  },

  async sendMessagePromise<T = unknown>(message: Record<string, unknown>) {
    if (!client) {
      throw new Error("Not connected");
    }
    return client.sendMessagePromise<T>(message);
  },

  async subscribeMessage<T = unknown>(
    message: Record<string, unknown>,
    onMessage: (result: T) => void,
  ) {
    if (!client) {
      throw new Error("Not connected");
    }
    return client.subscribeMessage<T>(message, onMessage);
  },

  sendBinary(data) {
    if (!client) {
      throw new Error("Not connected");
    }
    client.sendBinary(data);
  },

  async ping() {
    if (!client) {
      throw new Error("Not connected");
    }
    await client.ping();
  },

  async bootstrap() {
    let settings: ConnectionSettings | null = null;
    try {
      settings = await loadConnectionSettings();
      if (!settings) {
        set({ session: "signed-out" });
        return;
      }

      saved = settings;
      set({
        profile: settings.profile,
        authMode: settings.authMode,
        session: "active",
      });
    } finally {
      set({ hydrated: true });
    }

    // Everything past here runs with the shell already painted, so a slow or
    // unreachable hub costs the user a spinner rather than a blank window.
    if (!settings) return;
    if (settings.mode === "demo") {
      await get().connectDemo();
      return;
    }

    // Restore the webhook before connecting so the push channel can subscribe
    // on the first "connected" rather than waiting for the round-trip that
    // re-verifies it.
    set({ registration: await loadRegistration() });
    await get().connect();
  },
}));

async function beginLive(
  settings: ConnectionSettings,
  address: string,
  set: (partial: Partial<HaState>) => void,
) {
  grantRefused = false;
  set({
    status: "connecting",
    failure: null,
    mode: "live",
    authMode: settings.authMode,
    profile: settings.profile,
  });

  let next: EntityClient;
  try {
    next = await openWithTimeout(address, settings);
  } catch (error) {
    cleanupClient();
    set({
      status: "error",
      failure: toFailure(error, settings.authMode),
      entities: {},
      areas: [],
      areaByEntity: {},
      activeUrl: "",
    });
    return;
  }

  saved = settings;
  await saveConnectionSettings(settings);
  set({ activeUrl: address, session: "active" });
  attachClient(next, set, address);
}

function withAddress(
  profile: ConnectionProfile,
  address: string,
  slot: AddressSlot,
): ConnectionProfile {
  return slot === "internal"
    ? { ...profile, internalUrl: address }
    : { ...profile, externalUrl: address };
}

