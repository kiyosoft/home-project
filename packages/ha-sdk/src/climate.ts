import { numericAttr, stringAttr } from "./attrs";
import type { HassEntity } from "./types";

export const CLIMATE_STEP = 0.5;

export interface ClimateView {
  current: number | undefined;
  target: number | undefined;
  unit: string;
  hvac: string;
  heating: boolean;
  cooling: boolean;
  isOff: boolean;
}

export function deriveClimate(entity: HassEntity): ClimateView {
  const attrs = entity.attributes;
  const hvac = stringAttr(attrs, "hvac_action") ?? entity.state;
  return {
    current: numericAttr(attrs, "current_temperature"),
    target: numericAttr(attrs, "temperature"),
    unit: stringAttr(attrs, "temperature_unit") ?? "°",
    hvac,
    heating: hvac === "heating" || hvac === "heat",
    cooling: hvac === "cooling" || hvac === "cool",
    isOff: entity.state === "off",
  };
}

/** Half-degree setpoints, matching HA climate cards. */
export function stepClimateTarget(current: number, delta: number): number {
  return Math.round((current + delta) * 2) / 2;
}
