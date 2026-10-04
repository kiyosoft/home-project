import { describe, expect, it } from "vitest";

import { attentionItems } from "./attention";
import type { HassEntities, HassEntity } from "./types";

function entity(
  id: string,
  state: string,
  attributes: Record<string, unknown> = {},
  lastChanged?: string,
): HassEntity {
  return { entity_id: id, state, attributes, last_changed: lastChanged };
}

describe("attentionItems", () => {
  const now = Date.parse("2026-09-24T10:00:00Z");

  it("covers more than a low battery", () => {
    const entities: HassEntities = {
      "lock.nuki": entity("lock.nuki", "unavailable", {
        friendly_name: "Nuki Smart Lock",
      }),
      "light.hall": entity("light.hall", "unavailable", {
        friendly_name: "Hall",
      }),
      "sensor.lock_battery": entity("sensor.lock_battery", "15", {
        device_class: "battery",
        friendly_name: "Lock battery",
      }),
      "sensor.ok": entity("sensor.ok", "40", { device_class: "battery" }),
      "binary_sensor.smoke": entity("binary_sensor.smoke", "on", {
        device_class: "smoke",
        friendly_name: "Kitchen smoke",
      }),
      "binary_sensor.door": entity(
        "binary_sensor.door",
        "on",
        { device_class: "door", friendly_name: "Front door" },
        "2026-09-24T09:40:00Z",
      ),
      "binary_sensor.window": entity(
        "binary_sensor.window",
        "on",
        { device_class: "window", friendly_name: "Just opened" },
        "2026-09-24T09:55:00Z",
      ),
    };

    expect(attentionItems(entities, ["light.hall"], now).map((item) => item.kind)).toEqual([
      "safety",
      "unavailable",
      "unavailable",
      "opening",
      "battery",
    ]);
  });
});
