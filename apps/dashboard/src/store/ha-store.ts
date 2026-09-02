import {
  connectDemo,
  connectLive,
  connectLiveWithTokens,
  EMPTY_AREA_INDEX,
  fetchAreaIndex,
  fetchCurrentUser,
  revokeTokens,
  type AreaRegistryEntry,
  type ConnectionStatus,
  type EntityClient,
  type HassEntities,
} from "@ethio/ha-sdk";
import { create } from "zustand";

import {
  signInWithPassword,
  submitMfaCode,
  type LoginFailure,
  type LoginStep,
} from "@/lib/ha-auth";
import {
  clearConnectionSettings,
  loadConnectionSettings,
  saveConnectionSettings,
  saveConnectionTokens,
  type ConnectionMode,
  type ConnectionSettings,
} from "@/lib/settings";

interface HaState {
  entities: HassEntities;
  areas: AreaRegistryEntry[];
  areaByEntity: Record<string, string>;
  status: ConnectionStatus;
  error: string | null;
  /** Set when a failed sign-in is what the user has to fix. */
  loginFailure: LoginFailure | null;
  /** Non-null while Home Assistant is waiting on a second factor. */
  mfaFlowId: string | null;
  mode: ConnectionMode | null;
  baseUrl: string;
  /** Signed-in dashboard user. Separate from whoever just arrived home. */
  userName: string;
  userId: string;
  signIn: (baseUrl: string, username: string, password: string) => Promise<void>;
  submitMfa: (code: string) => Promise<void>;
  /** Drop a half-finished sign-in and its error so the form starts clean. */
  resetLogin: () => void;
  connectLive: (baseUrl: string, token: string) => Promise<void>;
  connectDemo: () => Promise<void>;
  reconnect: () => Promise<void>;
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
  bootstrap: () => Promise<void>;
}

let client: EntityClient | null = null;
let unsubscribe: (() => void) | null = null;
let savedCredentials: ConnectionSettings | null = null;

function cleanupClient() {
  unsubscribe?.();
  unsubscribe = null;
  client?.disconnect();
  client = null;
}

async function attachClient(
  next: EntityClient,
  set: (partial: Partial<HaState>) => void,
) {
  cleanupClient();
  client = next;
  unsubscribe = next.subscribeEntities((entities) => {
    // Shallow-copy the map so identity changes (HA often mutates in place).
    // Entity objects stay shared so per-id selectors can skip unrelated widgets.
    set({ entities: { ...entities }, status: "connected", error: null });
  });
  set({ status: "connected", error: null, loginFailure: null });
  void loadUser(next, set);
  void loadAreas(next, set);
}

async function loadAreas(
  target: EntityClient,
  set: (partial: Partial<HaState>) => void,
) {
  try {
    const index = await fetchAreaIndex(target);
    if (client !== target) return;
    set({ areas: index.areas, areaByEntity: index.areaByEntity });
  } catch {
    if (client !== target) return;
    set({
      areas: EMPTY_AREA_INDEX.areas,
      areaByEntity: EMPTY_AREA_INDEX.areaByEntity,
    });
  }
}

async function loadUser(
  target: EntityClient,
  set: (partial: Partial<HaState>) => void,
) {
  const user = await fetchCurrentUser((message) =>
    target.sendMessagePromise(message),
  );
  if (client !== target) return;
  set({
    userName: user?.name?.trim() ?? "",
    userId: user?.id ?? "",
  });
}

function openClient(settings: ConnectionSettings): Promise<EntityClient> {
  if (settings.authMode === "token" || !settings.tokens) {
    return connectLive({ baseUrl: settings.baseUrl, token: settings.token });
  }
  return connectLiveWithTokens({
    baseUrl: settings.baseUrl,
    tokens: settings.tokens,
    onTokens: (next) => {
      if (savedCredentials) savedCredentials.tokens = next;
      saveConnectionTokens(next);
    },
  });
}

/** Saved credentials that are too incomplete to be worth a connection attempt. */
function isConnectable(settings: ConnectionSettings): boolean {
  if (!settings.baseUrl) return false;
  return settings.authMode === "oauth" ? !!settings.tokens : !!settings.token;
}

export const useHaStore = create<HaState>((set, get) => ({
  entities: {},
  areas: [],
  areaByEntity: {},
  status: "idle",
  error: null,
  loginFailure: null,
  mfaFlowId: null,
  mode: null,
  baseUrl: "",
  userName: "",
  userId: "",

  async signIn(baseUrl, username, password) {
    set({
      status: "connecting",
      error: null,
      loginFailure: null,
      mfaFlowId: null,
      mode: "live",
      baseUrl,
    });
    await applyLoginStep(
      await signInWithPassword({ baseUrl, username, password }),
      baseUrl,
      set,
    );
  },

  async submitMfa(code) {
    const { baseUrl, mfaFlowId } = get();
    if (!mfaFlowId) return;
    set({ status: "connecting", error: null, loginFailure: null });
    await applyLoginStep(
      await submitMfaCode({ baseUrl, flowId: mfaFlowId, code }),
      baseUrl,
      set,
    );
  },

  resetLogin() {
    set({ mfaFlowId: null, status: "idle", loginFailure: null, mode: null });
  },

  async connectLive(baseUrl, token) {
    await beginLive(
      { mode: "live", authMode: "token", baseUrl, token, tokens: null },
      set,
    );
  },

  async connectDemo() {
    set({
      status: "connecting",
      error: null,
      loginFailure: null,
      mode: "demo",
      baseUrl: "",
    });
    try {
      const next = connectDemo();
      savedCredentials = {
        mode: "demo",
        authMode: "token",
        baseUrl: "",
        token: "",
        tokens: null,
      };
      saveConnectionSettings(savedCredentials);
      await attachClient(next, set);
    } catch (error) {
      cleanupClient();
      const message =
        error instanceof Error ? error.message : "Failed to start demo mode";
      set({
        status: "error",
        error: message,
        entities: {},
        areas: [],
        areaByEntity: {},
        mode: "demo",
        baseUrl: "",
      });
      throw error;
    }
  },

  async reconnect() {
    const settings = savedCredentials ?? loadConnectionSettings();
    if (!settings) return;
    if (settings.mode === "demo") {
      await get().connectDemo();
      return;
    }
    if (!isConnectable(settings)) return;
    await beginLive(settings, set);
  },

  disconnect(options) {
    const previous = savedCredentials;
    cleanupClient();
    if (options?.clearSaved) {
      if (previous?.authMode === "oauth" && previous.tokens && previous.baseUrl) {
        void revokeTokens({
          baseUrl: previous.baseUrl,
          refreshToken: previous.tokens.refreshToken,
        });
      }
      clearConnectionSettings();
      savedCredentials = null;
    }
    set({
      entities: {},
      areas: [],
      areaByEntity: {},
      status: "idle",
      error: null,
      loginFailure: null,
      mfaFlowId: null,
      mode: null,
      baseUrl: "",
      userName: "",
      userId: "",
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

  async bootstrap() {
    const settings = loadConnectionSettings();
    if (!settings) return;
    savedCredentials = settings;
    if (settings.mode === "demo") {
      await get().connectDemo();
      return;
    }
    if (!isConnectable(settings)) return;
    try {
      await beginLive(settings, set);
    } catch {
      // Error state already set; stay on setup with message.
    }
  },
}));

async function applyLoginStep(
  step: LoginStep,
  baseUrl: string,
  set: (partial: Partial<HaState>) => void,
) {
  if (step.kind === "mfa") {
    set({ status: "idle", mfaFlowId: step.flowId });
    return;
  }
  if (step.kind === "failure") {
    const patch: Partial<HaState> = {
      status: "idle",
      loginFailure: step.failure,
      mode: null,
    };
    // A wrong second factor leaves the flow open for another try; every other
    // failure has already burnt it.
    if (step.failure !== "invalid-code") patch.mfaFlowId = null;
    set(patch);
    return;
  }

  try {
    await beginLive(
      {
        mode: "live",
        authMode: "oauth",
        baseUrl,
        token: "",
        tokens: step.tokens,
      },
      set,
    );
  } catch {
    // Error state already set; stay on setup with the message.
  }
}

async function beginLive(
  settings: ConnectionSettings,
  set: (partial: Partial<HaState>) => void,
) {
  set({
    status: "connecting",
    error: null,
    loginFailure: null,
    mfaFlowId: null,
    mode: "live",
    baseUrl: settings.baseUrl,
  });

  try {
    const next = await openClient(settings);
    savedCredentials = settings;
    saveConnectionSettings(settings);
    await attachClient(next, set);
  } catch (error) {
    cleanupClient();
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect to Home Assistant";
    set({
      status: "error",
      error: message,
      entities: {},
      areas: [],
      areaByEntity: {},
      mode: "live",
      baseUrl: settings.baseUrl,
    });
    throw error;
  }
}
