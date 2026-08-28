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
  type RegistrationFailure,
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

interface HaState {
  entities: HassEntities;
  /** Empty until the area registry resolves. */
  areas: AreaRegistryEntry[];
  areaByEntity: Record<string, string>;
  status: ConnectionStatus;
  failure: ConnectFailure | null;
  mode: ConnectionMode | null;
  authMode: AuthMode;
  profile: ConnectionProfile;
  /** The address the live socket is on. */
  activeUrl: string;
  /** False until saved credentials have been read off disk. */
  hydrated: boolean;
  /** Our `mobile_app` registration. Null in demo mode and before it lands. */
  registration: StoredRegistration | null;
  registrationFailure: RegistrationFailure | null;
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

/** Connected, or dropped and already retrying — stay on the dashboard. */
export function hasSession(status: ConnectionStatus): boolean {
  return status === "connected" || status === "reconnecting";
}

let client: EntityClient | null = null;
let unsubscribe: (() => void) | null = null;
let unsubscribeStatus: (() => void) | null = null;
let saved: ConnectionSettings | null = null;

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
    cleanupClient();
    set({
      status: "error",
      failure:
        saved?.authMode === "oauth"
          ? { kind: "signed-out" }
          : { kind: "token-rejected" },
      entities: {},
      areas: [],
      areaByEntity: {},
      activeUrl: "",
    });
  });
  set({ status: "connected", failure: null });
  void loadAreas(next, set);
  if (baseUrl) void registerDevice(next, set, baseUrl);
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
  set(
    result.ok
      ? { registration: result.registration, registrationFailure: null }
      : { registration: result.registration, registrationFailure: result.failure },
  );
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
    return Promise.reject(new SignedOutError());
  }
  return connectLiveWithTokens({
    baseUrl: url,
    tokens: settings.tokens,
    onTokens: (next) => {
      if (saved) saved.tokens = next;
      void saveTokens(next);
    },
  });
}

/** Distinguished from a rejected token: there is nothing to reject. */
class SignedOutError extends Error {}

function toFailure(error: unknown): ConnectFailure {
  if (error instanceof SignedOutError) return { kind: "signed-out" };
  return classifyConnectError(error);
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

export const useHaStore = create<HaState>((set, get) => ({
  entities: {},
  areas: [],
  areaByEntity: {},
  status: "idle",
  failure: null,
  mode: null,
  authMode: "oauth",
  profile: defaultProfile,
  activeUrl: "",
  hydrated: false,
  registration: null,
  registrationFailure: null,

  setRegistration(registration) {
    set({ registration, registrationFailure: null });
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
      set({ status: "error", failure: { kind: "no-address" }, activeUrl: "" });
      return;
    }

    let failure: ConnectFailure = { kind: "unreachable" };
    for (const candidate of candidates) {
      try {
        const next = await openClient(candidate.url, settings);
        set({ activeUrl: candidate.url });
        attachClient(next, set, candidate.url);
        return;
      } catch (error) {
        failure = toFailure(error);
        if (failure.kind !== "unreachable") break;
      }
    }

    cleanupClient();
    set({
      status: "error",
      failure,
      entities: {},
      areas: [],
      areaByEntity: {},
      activeUrl: "",
    });
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
      set({ profile: defaultProfile, registration: null, registrationFailure: null });
      attachClient(next, set, "");
    } catch (error) {
      cleanupClient();
      set({
        status: "error",
        failure: toFailure(error),
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
      profile: options?.clearSaved ? defaultProfile : get().profile,
      registration: options?.clearSaved ? null : get().registration,
      registrationFailure: null,
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
    try {
      const settings = await loadConnectionSettings();
      if (!settings) return;
      saved = settings;
      set({ profile: settings.profile, authMode: settings.authMode });

      if (settings.mode === "demo") {
        await get().connectDemo();
        return;
      }

      // Restore the webhook before connecting so the push channel can subscribe
      // on the first "connected" rather than waiting for the round-trip that
      // re-verifies it.
      set({ registration: await loadRegistration() });
      await get().connect();
    } finally {
      set({ hydrated: true });
    }
  },
}));

async function beginLive(
  settings: ConnectionSettings,
  address: string,
  set: (partial: Partial<HaState>) => void,
) {
  set({
    status: "connecting",
    failure: null,
    mode: "live",
    authMode: settings.authMode,
    profile: settings.profile,
  });

  let next: EntityClient;
  try {
    next = await openClient(address, settings);
  } catch (error) {
    cleanupClient();
    set({
      status: "error",
      failure: toFailure(error),
      entities: {},
      areas: [],
      areaByEntity: {},
      activeUrl: "",
    });
    return;
  }

  saved = settings;
  await saveConnectionSettings(settings);
  set({ activeUrl: address });
  attachClient(next, set, address);

  const patch = await adoptInstanceAddresses(next, settings.profile);
  if (Object.keys(patch).length === 0 || client !== next) return;
  const profile = { ...settings.profile, ...patch };
  saved = { ...settings, profile };
  await saveConnectionSettings(saved);
  set({ profile });
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

