import type { RegistryCatalogEntry } from "./catalog-types";
import { loadRemotePlugin } from "./dynamic-loader";
import {
  addInstalledPlugin,
  loadInstalledPlugins,
  removeInstalledPlugin,
} from "./installed-store";
import { isPluginLoaded, registerPlugin, unregisterPlugin } from "./manager";

export async function loadInstalledRemotePlugins(): Promise<void> {
  const installed = loadInstalledPlugins();
  for (const entry of installed) {
    if (isPluginLoaded(entry.id)) continue;
    try {
      const plugin = await loadRemotePlugin(entry.entryUrl);
      if (plugin.id !== entry.id) {
        console.warn(
          `[ethio] Installed plugin id mismatch: catalog ${entry.id} vs module ${plugin.id}`,
        );
      }
      registerPlugin(plugin);
    } catch (error) {
      console.error(`[ethio] Failed to load remote plugin ${entry.id}`, error);
    }
  }
}

export async function installRemotePlugin(
  entry: RegistryCatalogEntry,
): Promise<void> {
  if (isPluginLoaded(entry.id)) {
    throw new Error(`Plugin already loaded: ${entry.id}`);
  }
  const plugin = await loadRemotePlugin(entry.entryUrl);
  if (plugin.id !== entry.id) {
    throw new Error(
      `Plugin id mismatch: catalog says ${entry.id}, module exports ${plugin.id}`,
    );
  }
  registerPlugin(plugin);
  addInstalledPlugin(entry);
}

export function uninstallRemotePlugin(pluginId: string): void {
  unregisterPlugin(pluginId);
  removeInstalledPlugin(pluginId);
}
