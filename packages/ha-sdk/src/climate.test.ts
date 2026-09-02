import { describe, expect, it } from "vitest";

import { deriveClimate, stepClimateTarget } from "./climate";
import type { HassEntity } from "./types";

function climate(
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity {
  return { entity_id: "climate.room", state, attributes };
}

describe("deriveClimate", () => {
  it("reads current, target, and HVAC action", () => {
    expect(
      deriveClimate(
        climate("heat", {
          current_temperature: 21,
          temperature: 22.5,
          temperature_unit: "°C",
          hvac_action: "heating",
        }),
      ),
    ).toEqual({
      current: 21,
      target: 22.5,
      unit: "°C",
      hvac: "heating",
      heating: true,
      cooling: false,
      isOff: false,
    });
  });

  it("falls back to entity state when HVAC action is missing", () => {
    expect(deriveClimate(climate("cool")).hvac).toBe("cool");
    expect(deriveClimate(climate("cool")).cooling).toBe(true);
    expect(deriveClimate(climate("off")).isOff).toBe(true);
  });
});

describe("stepClimateTarget", () => {
  it("snaps to half degrees", () => {
    expect(stepClimateTarget(21, 0.5)).toBe(21.5);
    expect(stepClimateTarget(21.5, -0.5)).toBe(21);
  });
});
