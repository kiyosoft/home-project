export const SNAPPABLE_DOMAINS = [
  "light",
  "switch",
  "input_boolean",
  "fan",
  "scene",
  "script",
] as const;

export type SnappableDomain = (typeof SNAPPABLE_DOMAINS)[number];

export function isSnappableDomain(domain: string): domain is SnappableDomain {
  return (SNAPPABLE_DOMAINS as readonly string[]).includes(domain);
}

export interface WatchDevicePaint {
  entityId: string;
  areaId: string;
  painted: boolean;
  contested: boolean;
}

export interface WatchCatalogArea {
  id: string;
  name: string;
}

export interface WatchCatalogEntity {
  id: string;
  name: string;
  areaId: string;
  domain: string;
}

export interface WatchCatalog {
  areas: WatchCatalogArea[];
  entities: WatchCatalogEntity[];
  atHome: boolean;
  currentAreaId: string;
}
