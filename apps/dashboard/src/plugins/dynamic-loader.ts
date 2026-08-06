import type { DefinedPlugin } from "@ethio/plugin-sdk";

function isDefinedPlugin(value: unknown): value is DefinedPlugin {
  if (!value || typeof value !== "object") return false;
  const plugin = value as Partial<DefinedPlugin>;
  return typeof plugin.id === "string" && typeof plugin.name === "string";
}

/**
 * Load a remote ESM plugin. Bundles must use `globalThis.__ETHIO_HOST__`
 * for React / plugin-sdk / zod (see docs/plugins.md).
 */
export async function loadRemotePlugin(entryUrl: string): Promise<DefinedPlugin> {
  const url = new URL(entryUrl, window.location.origin).href;
  const mod = (await import(/* @vite-ignore */ url)) as {
    default?: unknown;
    plugin?: unknown;
  };

  const candidate = mod.plugin ?? mod.default;
  if (!isDefinedPlugin(candidate)) {
    throw new Error(
      `Remote module at ${url} must export a plugin (default or named "plugin")`,
    );
  }
  return candidate;
}
