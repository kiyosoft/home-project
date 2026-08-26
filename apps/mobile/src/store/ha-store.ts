import {
  connectDemo,
  connectLive,
  EMPTY_AREA_INDEX,
  fetchAreaIndex,
  type AreaRegistryEntry,
  type ConnectionStatus,
  type EntityClient,
  type HassEntities,
} from "@ethio/ha-sdk";
import { create } from "zustand";

import { classifyConnectError, type ConnectFailure } from "@/lib/connection-error";
import {
  clearConnectionSettings,
  loadConnectionSettings,
  saveConnectionSettings,
  type ConnectionMode,
  type ConnectionSettings,
} from "@/lib/settings";

interface HaState {
  entities: HassEntities;
  /** Empty until the area registry resolves. */
  areas: AreaRegistryEntry[];
  areaByEntity: Record<string, string>;
  status: ConnectionStatus;
  /** Null until a connection attempt fails. Drives the per-field verdicts. */
  failure: ConnectFailure | null;
  mode: ConnectionMode | null;
  baseUrl: string;
  /** False until saved credentials have been read off disk. */
  hydrated: boolean;
  connectLive: (baseUrl: string, token: string) => Promise<void>;
  connectDemo: () => Promise<void>;
  disconnect: (options?: { clearSaved?: boolean }) => void;
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => Promise<void>;
  sendMessagePromise: <T = unknown>(
    message: Record<string, unknown>,
  ) => Promise<T>;
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

function attachClient(
  next: EntityClient,
  set: (partial: Partial<HaState>) => void,
) {
  cleanupClient();
  client = next;
  unsubscribe = next.subscribeEntities((entities) => {
    // Shallow-copy the map so identity changes (HA often mutates in place).
    // Entity objects stay shared so per-id selectors can skip unrelated tiles.
    set({ entities: { ...entities }, status: "connected", failure: null });
  });
  set({ status: "connected", failure: null });
  void loadAreas(next, set);
}

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

export const useHaStore = create<HaState>((set, get) => ({
  entities: {},
  areas: [],
  areaByEntity: {},
  status: "idle",
  failure: null,
  mode: null,
  baseUrl: "",
  hydrated: false,

  async connectLive(baseUrl, token) {
    set({ status: "connecting", failure: null, mode: "live", baseUrl });
    try {
      const next = await connectLive({ baseUrl, token });
      savedCredentials = { mode: "live", baseUrl, token };
      await saveConnectionSettings(savedCredentials);
      attachClient(next, set);
    } catch (error) {
      cleanupClient();
      set({
        status: "error",
        failure: classifyConnectError(error),
        entities: {},
        areas: [],
        areaByEntity: {},
        mode: "live",
        baseUrl,
      });
    }
  },

  async connectDemo() {
    set({ status: "connecting", failure: null, mode: "demo", baseUrl: "" });
    try {
      const next = connectDemo();
      savedCredentials = { mode: "demo", baseUrl: "", token: "" };
      await saveConnectionSettings(savedCredentials);
      attachClient(next, set);
    } catch (error) {
      cleanupClient();
      set({
        status: "error",
        failure: classifyConnectError(error),
        entities: {},
        areas: [],
        areaByEntity: {},
        mode: "demo",
        baseUrl: "",
      });
    }
  },

  disconnect(options) {
    cleanupClient();
    if (options?.clearSaved) {
      void clearConnectionSettings();
      savedCredentials = null;
    }
    set({
      entities: {},
      areas: [],
      areaByEntity: {},
      status: "idle",
      failure: null,
      mode: null,
      baseUrl: "",
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

  async bootstrap() {
    try {
      const settings = await loadConnectionSettings();
      if (!settings) return;
      savedCredentials = settings;

      if (settings.mode === "demo") {
        await get().connectDemo();
        return;
      }
      if (settings.baseUrl && settings.token) {
        // connectLive already records the failure; stay on Connect either way.
        await get().connectLive(settings.baseUrl, settings.token);
      } else {
        set({ baseUrl: settings.baseUrl });
      }
    } finally {
      set({ hydrated: true });
    }
  },
}));

/** Credentials read at startup, so Connect can prefill without a re-read. */
export function savedConnection(): ConnectionSettings | null {
  return savedCredentials;
}
