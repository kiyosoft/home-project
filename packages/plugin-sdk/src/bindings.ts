import type { PlatformBindings } from "./types";

let bindings: PlatformBindings | null = null;
let activePluginId: string | null = null;

export function createPlatformBindings(next: PlatformBindings): void {
  bindings = {
    ...next,
    getActivePluginId: () => activePluginId,
  };
}

export function getPlatformBindings(): PlatformBindings {
  if (!bindings) {
    throw new Error(
      "@ethio/plugin-sdk: platform bindings not initialized. Call createPlatformBindings() from the dashboard.",
    );
  }
  return bindings;
}

export function runWithPluginContext<T>(pluginId: string, fn: () => T): T {
  const prev = activePluginId;
  activePluginId = pluginId;
  try {
    return fn();
  } finally {
    activePluginId = prev;
  }
}

export function setActivePluginId(pluginId: string | null): void {
  activePluginId = pluginId;
}
