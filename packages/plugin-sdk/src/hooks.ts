import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  browseMedia as haBrowseMedia,
  subscribeTodoItems,
  type BrowseMediaItem,
  type BrowseMediaOptions,
  type HassEntities,
  type HassEntity,
  type TodoItem,
} from "@ethio/ha-sdk";

import { getPlatformBindings } from "./bindings";
import { usePluginId } from "./context";
import type { Capability } from "./types";

type Listener = () => void;

const listeners = new Set<Listener>();
let snapshotVersion = 0;

/** Dashboard calls this when entity map changes so hooks re-render. */
export function notifyEntityStoreChanged(): void {
  snapshotVersion += 1;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshotVersion(): number {
  return snapshotVersion;
}

function assertCapability(
  pluginId: string | null,
  capability: Capability,
): void {
  if (!pluginId) return;
  const bindings = getPlatformBindings();
  if (bindings.hasCapability && !bindings.hasCapability(pluginId, capability)) {
    throw new Error(`Plugin ${pluginId} lacks capability "${capability}"`);
  }
}

export function useEntity(entityId: string): HassEntity | undefined {
  const pluginId = usePluginId();
  useSyncExternalStore(subscribe, getSnapshotVersion, getSnapshotVersion);
  assertCapability(pluginId, "entity.read");
  if (!entityId) return undefined;
  return getPlatformBindings().getEntity(entityId);
}

export function useEntities(
  predicate?: (entity: HassEntity) => boolean,
): HassEntities {
  const pluginId = usePluginId();
  useSyncExternalStore(subscribe, getSnapshotVersion, getSnapshotVersion);
  assertCapability(pluginId, "entity.read");
  const all = getPlatformBindings().getEntities();
  if (!predicate) return all;
  return Object.fromEntries(
    Object.entries(all).filter(([, entity]) => predicate(entity)),
  );
}

export function useCallService(): (
  domain: string,
  service: string,
  data?: Record<string, unknown>,
) => Promise<void> {
  const pluginId = usePluginId();
  return useCallback(
    async (domain: string, service: string, data?: Record<string, unknown>) => {
      if (!pluginId) {
        throw new Error("useCallService must be used inside PluginScope");
      }
      await callServiceAsPlugin(pluginId, domain, service, data);
    },
    [pluginId],
  );
}

export async function callServiceAsPlugin(
  pluginId: string,
  domain: string,
  service: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const bindings = getPlatformBindings();
  if (
    bindings.hasCapability &&
    !bindings.hasCapability(pluginId, "service.call")
  ) {
    throw new Error(`Plugin ${pluginId} lacks capability "service.call"`);
  }
  await bindings.callService(domain, service, data);
}

export function useSendMessage(): <T = unknown>(
  message: Record<string, unknown>,
) => Promise<T> {
  const pluginId = usePluginId();
  return useCallback(
    async <T = unknown>(message: Record<string, unknown>) => {
      if (!pluginId) {
        throw new Error("useSendMessage must be used inside PluginScope");
      }
      assertCapability(pluginId, "entity.read");
      const bindings = getPlatformBindings();
      if (!bindings.sendMessagePromise) {
        throw new Error("Platform does not support sendMessagePromise");
      }
      return bindings.sendMessagePromise<T>(message);
    },
    [pluginId],
  );
}

export function useBrowseMedia(): (
  options: BrowseMediaOptions,
) => Promise<BrowseMediaItem> {
  const sendMessage = useSendMessage();
  return useCallback(
    (options: BrowseMediaOptions) => haBrowseMedia(sendMessage, options),
    [sendMessage],
  );
}

export function useSubscribeMessage(): <T = unknown>(
  message: Record<string, unknown>,
  onMessage: (result: T) => void,
) => Promise<() => void> {
  const pluginId = usePluginId();
  return useCallback(
    async <T = unknown>(
      message: Record<string, unknown>,
      onMessage: (result: T) => void,
    ) => {
      if (!pluginId) {
        throw new Error("useSubscribeMessage must be used inside PluginScope");
      }
      assertCapability(pluginId, "entity.read");
      const bindings = getPlatformBindings();
      if (!bindings.subscribeMessage) {
        throw new Error("Platform does not support subscribeMessage");
      }
      return bindings.subscribeMessage<T>(message, onMessage);
    },
    [pluginId],
  );
}

export interface TodoItemsState {
  items: TodoItem[];
  loading: boolean;
  error: string | null;
}

/** Live to-do items for an entity via todo/item/subscribe. */
export function useTodoItems(entityId: string): TodoItemsState {
  const pluginId = usePluginId();
  const subscribeMessage = useSubscribeMessage();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(Boolean(entityId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        assertCapability(pluginId, "entity.read");
        unsubscribe = await subscribeTodoItems(
          subscribeMessage,
          entityId,
          (next) => {
            if (cancelled) return;
            setItems(next);
            setLoading(false);
            setError(null);
          },
        );
        if (cancelled) {
          unsubscribe();
        }
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setLoading(false);
        setError(err instanceof Error ? err.message : "Failed to load to-do");
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [entityId, pluginId, subscribeMessage]);

  return { items, loading, error };
}

export function useBaseUrl(): string {
  useSyncExternalStore(subscribe, getSnapshotVersion, getSnapshotVersion);
  return getPlatformBindings().getBaseUrl?.() ?? "";
}

/** Resolve HA entity_picture (absolute or relative) against the connected base URL. */
export function resolveEntityImageUrl(
  picture: string | null | undefined,
  baseUrl?: string,
): string | null {
  if (!picture || typeof picture !== "string") return null;
  const trimmed = picture.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  const base = (baseUrl ?? getPlatformBindings().getBaseUrl?.() ?? "").replace(
    /\/+$/,
    "",
  );
  if (!base) return trimmed;
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}
