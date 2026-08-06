import { useSyncExternalStore } from "react";

import type { HassEntities, HassEntity } from "@ethio/ha-sdk";

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
  return async (domain, service, data) => {
    if (!pluginId) {
      throw new Error("useCallService must be used inside PluginScope");
    }
    await callServiceAsPlugin(pluginId, domain, service, data);
  };
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
