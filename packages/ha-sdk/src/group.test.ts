import { describe, expect, it } from "vitest";

import {
  areaCoverStat,
  areaStat,
  areaSummary,
  averageNumericStates,
  boundEntityIds,
  countLightsOn,
  deriveArea,
  discoverBatteries,
  formatAllOrFraction,
  formatFraction,
  groupMemberIds,
  tallyEntities,
  isOnState,
  unanimousService,
} from "./group";
import type { HassEntities, HassEntity } from "./types";

function entity(
  id: string,
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity {
  return { entity_id: id, state, attributes };
}

describe("groupMemberIds", () => {
  it("reads HA group members", () => {
    expect(
      groupMemberIds(
        entity("light.group", "on", {
          entity_id: ["light.a", "light.b"],
        }),
      ),
    ).toEqual(["light.a", "light.b"]);
  });
});

describe("boundEntityIds", () => {
  it("prefers config entity_ids", () => {
    expect(
      boundEntityIds(
        { entity_id: "light.group", entity_ids: ["light.x"] },
        entity("light.group", "on", { entity_id: ["light.a"] }),
      ),
    ).toEqual(["light.x"]);
  });

  it("falls back to group members then the primary id", () => {
    expect(
      boundEntityIds(
        { entity_id: "light.group" },
        entity("light.group", "on", { entity_id: ["light.a", "light.b"] }),
      ),
    ).toEqual(["light.a", "light.b"]);
    expect(boundEntityIds({ entity_id: "light.solo" })).toEqual(["light.solo"]);
  });
});

describe("tally and copy", () => {
  const entities: HassEntities = {
    "light.a": entity("light.a", "on"),
    "light.b": entity("light.b", "on"),
    "light.c": entity("light.c", "off"),
  };

  it("counts active members", () => {
    expect(
      tallyEntities(entities, ["light.a", "light.b", "light.c"], isOnState),
    ).toEqual({ total: 3, active: 2, ids: ["light.a", "light.b", "light.c"] });
  });

  it("formats fractions and unanimous labels", () => {
    expect(formatFraction(3, 3, "on")).toBe("3/3 on");
    expect(
      formatAllOrFraction(2, 2, {
        all: "All locked",
        none: "All unlocked",
        word: "locked",
      }),
    ).toBe("All locked");
    expect(
      formatAllOrFraction(0, 2, {
        all: "All on",
        none: "All off",
        word: "on",
      }),
    ).toBe("All off");
  });
});

describe("countLightsOn", () => {
  it("skips group entities so members are not double-counted", () => {
    const entities: HassEntities = {
      "light.a": entity("light.a", "on"),
      "light.b": entity("light.b", "on"),
      "light.group": entity("light.group", "on", {
        entity_id: ["light.a", "light.b"],
      }),
    };
    expect(countLightsOn(entities)).toBe(2);
  });
});

describe("discoverBatteries", () => {
  it("finds battery sensors and flags lows", () => {
    const entities: HassEntities = {
      "sensor.lock_battery": entity("sensor.lock_battery", "88", {
        device_class: "battery",
      }),
      "sensor.remote": entity("sensor.remote", "12", {
        device_class: "battery",
      }),
      "sensor.temp": entity("sensor.temp", "21", {
        device_class: "temperature",
      }),
    };
    const report = discoverBatteries(entities);
    expect(report.total).toBe(2);
    expect(report.low).toBe(1);
    expect(report.min).toBe(12);
  });
});

describe("averageNumericStates", () => {
  it("averages temperature sensors", () => {
    const entities: HassEntities = {
      "sensor.a": entity("sensor.a", "21.0", { unit_of_measurement: "°C" }),
      "sensor.b": entity("sensor.b", "22.6", { unit_of_measurement: "°C" }),
    };
    expect(averageNumericStates(entities, ["sensor.a", "sensor.b"])).toEqual({
      average: 21.8,
      count: 2,
      unit: "°C",
    });
  });
});

describe("deriveArea", () => {
  it("tallies leaf lights and skips the group entity", () => {
    const entities: HassEntities = {
      "light.group": entity("light.group", "on", {
        entity_id: ["light.a", "light.b"],
      }),
      "light.a": entity("light.a", "on"),
      "light.b": entity("light.b", "off"),
      "climate.room": entity("climate.room", "heat", {
        current_temperature: 21,
        temperature: 22,
        temperature_unit: "°C",
      }),
    };
    const overview = deriveArea(entities, [
      "light.group",
      "light.a",
      "light.b",
      "climate.room",
    ]);
    expect(overview.lightIds).toEqual(["light.a", "light.b"]);
    expect(overview.lights).toEqual({
      total: 2,
      active: 1,
      ids: ["light.a", "light.b"],
    });
    expect(overview.current).toBe(21);
    expect(overview.ideal).toBe(true);
    expect(
      areaSummary(overview, { ideal: "Ideal", empty: "No devices" }),
    ).toBe("1/2 on · Ideal");
    expect(unanimousService(overview.lights, "turn_on", "turn_off")).toBe(
      "turn_on",
    );
    expect(areaStat(overview.lights)).toBe("1/2");
    expect(
      areaCoverStat(overview.covers, { empty: "—", allOpen: "Open" }),
    ).toBe("—");
  });
});
