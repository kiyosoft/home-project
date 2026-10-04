import { describe, expect, it } from "vitest";

import { activeAlerts } from "./alert";
import type { HassEntities } from "./types";

describe("activeAlerts", () => {
  it("keeps only alerts whose condition is still true", () => {
    const entities: HassEntities = {
      "alert.garage_door": {
        entity_id: "alert.garage_door",
        state: "on",
        attributes: { friendly_name: "Garage is open" },
      },
      "alert.leak": {
        entity_id: "alert.leak",
        state: "idle",
        attributes: { friendly_name: "Water leak" },
      },
      "alert.battery": {
        entity_id: "alert.battery",
        state: "off",
        attributes: { friendly_name: "Low battery" },
      },
      "light.living_room": {
        entity_id: "light.living_room",
        state: "on",
        attributes: { friendly_name: "Living Room Light" },
      },
    };

    expect(activeAlerts(entities)).toEqual([
      { entityId: "alert.garage_door", name: "Garage is open" },
    ]);
  });
});
