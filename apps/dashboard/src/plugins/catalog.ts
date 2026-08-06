import type { RegistryCatalog, RegistryCatalogEntry } from "./catalog-types";

const DEFAULT_CATALOG_URL = "/registry/catalog.json";

export async function fetchCatalog(
  catalogUrl = DEFAULT_CATALOG_URL,
): Promise<RegistryCatalogEntry[]> {
  const response = await fetch(catalogUrl);
  if (!response.ok) {
    throw new Error(`Failed to load catalog (${response.status})`);
  }
  const data = (await response.json()) as RegistryCatalog;
  if (!Array.isArray(data.plugins)) {
    throw new Error("Invalid catalog: missing plugins array");
  }
  return data.plugins;
}
