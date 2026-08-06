import type {
  Capability,
  DefinedPlugin,
  RegisteredWidget,
} from "@ethio/plugin-sdk";

import {
  clearCommands,
  registerCommand,
  unregisterCommandsByPlugin,
} from "./commands";
import {
  clearWidgetRegistry,
  registerWidget,
  unregisterWidgetsByPlugin,
} from "./registry";

const pluginCapabilities = new Map<string, Set<Capability>>();
const loadedPluginIds = new Set<string>();

export function getPluginCapabilities(
  pluginId: string,
): ReadonlySet<Capability> {
  return pluginCapabilities.get(pluginId) ?? new Set();
}

export function pluginHasCapability(
  pluginId: string,
  capability: Capability,
): boolean {
  return getPluginCapabilities(pluginId).has(capability);
}

export function listLoadedPluginIds(): string[] {
  return [...loadedPluginIds];
}

export function isPluginLoaded(pluginId: string): boolean {
  return loadedPluginIds.has(pluginId);
}

/** Wipe registry and load a fresh set (built-ins). */
export function loadPlugins(plugins: DefinedPlugin[]): void {
  clearWidgetRegistry();
  clearCommands();
  pluginCapabilities.clear();
  loadedPluginIds.clear();

  for (const plugin of plugins) {
    registerPlugin(plugin);
  }
}

/** Incrementally register one plugin (built-in or remote). */
export function registerPlugin(plugin: DefinedPlugin): void {
  if (loadedPluginIds.has(plugin.id)) {
    throw new Error(`Duplicate plugin id: ${plugin.id}`);
  }

  const caps = new Set<Capability>();

  for (const widget of plugin.widgets ?? []) {
    for (const cap of widget.capabilities) {
      caps.add(cap);
    }
    const registered: RegisteredWidget = {
      ...widget,
      type: widget.id,
      pluginId: plugin.id,
      capabilities: [...widget.capabilities],
    };
    registerWidget(registered);
  }

  for (const command of plugin.commands ?? []) {
    if (command.capability) caps.add(command.capability);
    registerCommand(command);
  }

  pluginCapabilities.set(plugin.id, caps);
  loadedPluginIds.add(plugin.id);
}

export function unregisterPlugin(pluginId: string): void {
  if (!loadedPluginIds.has(pluginId)) return;
  unregisterWidgetsByPlugin(pluginId);
  unregisterCommandsByPlugin(pluginId);
  pluginCapabilities.delete(pluginId);
  loadedPluginIds.delete(pluginId);
}
