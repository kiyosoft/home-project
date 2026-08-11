import type { HassEntity } from "./types";

/** Bit flags from homeassistant.components.alarm_control_panel.AlarmControlPanelEntityFeature */
export const ALARM_FEATURE = {
  ARM_HOME: 1,
  ARM_AWAY: 2,
  ARM_NIGHT: 4,
  TRIGGER: 8,
  ARM_CUSTOM_BYPASS: 16,
  ARM_VACATION: 32,
} as const;

export function alarmSupportsFeature(
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

export interface AlarmView {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  isDisarmed: boolean;
  isArmedHome: boolean;
  isArmedAway: boolean;
  isArmedNight: boolean;
  isArmedVacation: boolean;
  isArmedCustomBypass: boolean;
  isPending: boolean;
  isArming: boolean;
  isDisarming: boolean;
  isTriggered: boolean;
  changedBy: string | undefined;
  codeFormat: string | undefined;
  codeArmRequired: boolean;
  supportsArmHome: boolean;
  supportsArmAway: boolean;
  supportsArmNight: boolean;
  supportsArmVacation: boolean;
  supportsArmCustomBypass: boolean;
  supportsTrigger: boolean;
}

export function deriveAlarm(entity: HassEntity | undefined): AlarmView | null {
  if (!entity) return null;
  const attrs = entity.attributes;
  const features = numAttr(attrs, "supported_features") ?? 0;
  const state = entity.state.toLowerCase();
  return {
    entityId: entity.entity_id,
    state: entity.state,
    attributes: attrs,
    isDisarmed: state === "disarmed",
    isArmedHome: state === "armed_home",
    isArmedAway: state === "armed_away",
    isArmedNight: state === "armed_night",
    isArmedVacation: state === "armed_vacation",
    isArmedCustomBypass: state === "armed_custom_bypass",
    isPending: state === "pending",
    isArming: state === "arming",
    isDisarming: state === "disarming",
    isTriggered: state === "triggered",
    changedBy: strAttr(attrs, "changed_by"),
    codeFormat: strAttr(attrs, "code_format"),
    codeArmRequired: attrs.code_arm_required === true,
    supportsArmHome: alarmSupportsFeature(features, ALARM_FEATURE.ARM_HOME),
    supportsArmAway: alarmSupportsFeature(features, ALARM_FEATURE.ARM_AWAY),
    supportsArmNight: alarmSupportsFeature(features, ALARM_FEATURE.ARM_NIGHT),
    supportsArmVacation: alarmSupportsFeature(
      features,
      ALARM_FEATURE.ARM_VACATION,
    ),
    supportsArmCustomBypass: alarmSupportsFeature(
      features,
      ALARM_FEATURE.ARM_CUSTOM_BYPASS,
    ),
    supportsTrigger: alarmSupportsFeature(features, ALARM_FEATURE.TRIGGER),
  };
}
