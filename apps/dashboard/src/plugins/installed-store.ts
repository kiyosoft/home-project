import type { RegistryCatalogEntry } from "./catalog-types";

const INSTALLED_KEY = "ethio-home.installed-plugins:v1";
const INSTALLED_KEY_LEGACY = "ethio-home.installed-plugins";

function readStorage(): string | null {
  const current = localStorage.getItem(INSTALLED_KEY);
  if (current != null) return current;
  const legacy = localStorage.getItem(INSTALLED_KEY_LEGACY);
  if (legacy == null) return null;
  localStorage.setItem(INSTALLED_KEY, legacy);
  localStorage.removeItem(INSTALLED_KEY_LEGACY);
  return legacy;
}

export function loadInstalledPlugins(): RegistryCatalogEntry[] {
  try {
    const raw = readStorage();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCatalogEntry);
  } catch {
    return [];
  }
}

export function saveInstalledPlugins(entries: RegistryCatalogEntry[]): void {
  localStorage.setItem(INSTALLED_KEY, JSON.stringify(entries));
  localStorage.removeItem(INSTALLED_KEY_LEGACY);
}

export function addInstalledPlugin(entry: RegistryCatalogEntry): void {
  const current = loadInstalledPlugins().filter((item) => item.id !== entry.id);
  saveInstalledPlugins([...current, entry]);
}

export function removeInstalledPlugin(pluginId: string): void {
  saveInstalledPlugins(
    loadInstalledPlugins().filter((item) => item.id !== pluginId),
  );
}

export function isPluginInstalled(pluginId: string): boolean {
  return loadInstalledPlugins().some((item) => item.id === pluginId);
}

function isCatalogEntry(value: unknown): value is RegistryCatalogEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<RegistryCatalogEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.name === "string" &&
    typeof entry.version === "string" &&
    typeof entry.entryUrl === "string" &&
    Array.isArray(entry.capabilities)
  );
}
