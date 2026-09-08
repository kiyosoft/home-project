export const TOGGLE_DOMAINS = [
  "light",
  "switch",
  "input_boolean",
  "fan",
] as const;

export const ACTIVATE_DOMAINS = ["scene", "script"] as const;

export const CONTROLLABLE_DOMAINS = [
  ...TOGGLE_DOMAINS,
  ...ACTIVATE_DOMAINS,
  "lock",
] as const;

export const SNAPPABLE_DOMAINS = CONTROLLABLE_DOMAINS;

export type ToggleDomain = (typeof TOGGLE_DOMAINS)[number];
export type ActivateDomain = (typeof ACTIVATE_DOMAINS)[number];
export type ControllableDomain = (typeof CONTROLLABLE_DOMAINS)[number];
export type SnappableDomain = ControllableDomain;

export function isToggleDomain(domain: string): domain is ToggleDomain {
  return (TOGGLE_DOMAINS as readonly string[]).includes(domain);
}

export function isActivateDomain(domain: string): domain is ActivateDomain {
  return (ACTIVATE_DOMAINS as readonly string[]).includes(domain);
}

export function isControllableDomain(
  domain: string,
): domain is ControllableDomain {
  return (CONTROLLABLE_DOMAINS as readonly string[]).includes(domain);
}

export function isSnappableDomain(domain: string): domain is SnappableDomain {
  return isControllableDomain(domain);
}

export const UNASSIGNED_AREA_ID = "unassigned";

export interface WatchDevicePaint {
  entityId: string;
  areaId: string;
  painted: boolean;
  contested: boolean;
  mapped?: boolean;
}

export interface WatchCatalogArea {
  id: string;
  name: string;
}

export interface WatchEntityCapabilities {
  brightness?: boolean;
  color?: boolean;
  lockCode?: boolean;
}

export interface WatchCatalogEntity {
  id: string;
  name: string;
  areaId: string;
  domain: string;
  favorite: boolean;
  capabilities: WatchEntityCapabilities;
}

export interface WatchCatalog {
  areas: WatchCatalogArea[];
  entities: WatchCatalogEntity[];
  atHome: boolean;
  currentAreaId: string;
}

export interface WatchEntityState {
  state: string;
  brightness?: number;
}

export interface WatchAreaRollup {
  lightsOn: number;
  unlocked: number;
}

export interface WatchHomeSummary {
  lightsOn: number;
  lockCount: number;
  unlocked: number;
}

export interface WatchSnapshot {
  atHome: boolean;
  connected: boolean;
  summary: WatchHomeSummary;
  areas: Record<string, WatchAreaRollup>;
  states: Record<string, WatchEntityState>;
}

export type WatchCommand =
  | { kind: "toggle"; entityId: string }
  | { kind: "activate"; entityId: string }
  | { kind: "lock"; entityId: string }
  | { kind: "unlock"; entityId: string }
  | {
      kind: "group";
      action: "lights_off" | "lights_on";
      areaId?: string;
    }
  | { kind: "set"; entityId: string; data: Record<string, unknown> };

export interface WatchCommandResult {
  ok: boolean;
  entityId?: string;
  state?: string;
}
