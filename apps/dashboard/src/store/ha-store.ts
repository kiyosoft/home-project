import {
  connectDemo,
  connectLive,
  type ConnectionStatus,
  type EntityClient,
  type HassEntities,
} from "@ethio/ha-sdk";
import { create } from "zustand";

import {
  clearConnectionSettings,
  loadConnectionSettings,
  saveConnectionSettings,
  type ConnectionMode,
  type ConnectionSettings,
} from "@/lib/settings";

interface HaState {
  entities: HassEntities;
  status: ConnectionStatus;
  error: string | null;
  mode: ConnectionMode | null;
  baseUrl: string;
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
    set({ entities, status: "connected", error: null });
  });
  set({ status: "connected", error: null });
}

export const useHaStore = create<HaState>((set, get) => ({
  entities: {},
  status: "idle",
  error: null,
  mode: null,
  baseUrl: "",

  async connectLive(baseUrl, token) {
    set({ status: "connecting", error: null, mode: "live", baseUrl });
    try {
      const next = await connectLive({ baseUrl, token });
      savedCredentials = { mode: "live", baseUrl, token };
      saveConnectionSettings(savedCredentials);
      await attachClient(next, set);
    } catch (error) {
      cleanupClient();
      const message =
        error instanceof Error ? error.message : "Failed to connect to Home Assistant";
      set({
        status: "error",
        error: message,
        entities: {},
        mode: "live",
        baseUrl,
      });
      throw error;
    }
  },

  async connectDemo() {
    set({ status: "connecting", error: null, mode: "demo", baseUrl: "" });
    try {
      const next = connectDemo();
      savedCredentials = { mode: "demo", baseUrl: "", token: "" };
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
    if (!settings.baseUrl || !settings.token) return;
    await get().connectLive(settings.baseUrl, settings.token);
  },

  disconnect(options) {
    cleanupClient();
    if (options?.clearSaved) {
      clearConnectionSettings();
      savedCredentials = null;
    }
    set({
      entities: {},
      status: "idle",
      error: null,
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
    const settings = loadConnectionSettings();
    if (!settings) return;
    savedCredentials = settings;
    if (settings.mode === "demo") {
      await get().connectDemo();
      return;
    }
    if (settings.baseUrl && settings.token) {
      try {
        await get().connectLive(settings.baseUrl, settings.token);
      } catch {
        // Error state already set; stay on setup with message.
      }
    }
  },
}));
