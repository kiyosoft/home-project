import type { HassEntity } from "./types";

/** Bit flags from homeassistant.components.lock.LockEntityFeature */
export const LOCK_FEATURE = {
  OPEN: 1,
} as const;

export function lockSupportsFeature(
  supportedFeatures: number,
  bit: number,
): boolean {
  return (supportedFeatures & bit) !== 0;
}

function numAttr(
  attrs: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = attrs[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function strAttr(
  attrs: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export interface LockView {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  isLocked: boolean;
  isUnlocked: boolean;
  isUnknown: boolean;
  isLocking: boolean;
  isUnlocking: boolean;
  isJammed: boolean;
  changedBy: string | undefined;
  supportsOpen: boolean;
}

export function deriveLock(entity: HassEntity | undefined): LockView | null {
  if (!entity) return null;
  const attrs = entity.attributes;
  const features = numAttr(attrs, "supported_features") ?? 0;
  const state = entity.state.toLowerCase();
  return {
    entityId: entity.entity_id,
    state: entity.state,
    attributes: attrs,
    isLocked: state === "locked",
    isUnlocked: state === "unlocked",
    isUnknown: state === "unknown" || state === "unavailable",
    isLocking: state === "locking",
    isUnlocking: state === "unlocking",
    isJammed: state === "jammed",
    changedBy: strAttr(attrs, "changed_by"),
    supportsOpen: lockSupportsFeature(features, LOCK_FEATURE.OPEN),
  };
}
