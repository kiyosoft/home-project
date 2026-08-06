import type { Capability } from "@ethio/plugin-sdk";

export interface RegistryCatalogEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  entryUrl: string;
  capabilities: Capability[];
  integrity?: string;
}

export interface RegistryCatalog {
  version: number;
  plugins: RegistryCatalogEntry[];
}
