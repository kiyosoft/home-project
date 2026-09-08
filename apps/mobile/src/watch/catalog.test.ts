import { describe, expect, it } from "vitest";

import { buildWatchCatalog, defaultWatchEntityIds, isSnappableEntityId } from "./catalog";

const kitchen = {
  entity_id: "light.kitchen",
  state: "on",
  attributes: { friendly_name: "Kitchen Light" },
  last_changed: "",
  last_updated: "",
  context: { id: "", user_id: null, parent_id: null },
};

describe("watch catalog", () => {
  it("accepts toggle and scene domains only", () => {
    expect(isSnappableEntityId("light.kitchen")).toBe(true);
    expect(isSnappableEntityId("scene.movie")).toBe(true);
    expect(isSnappableEntityId("camera.front")).toBe(false);
  });

  it("defaults to dashboard favourites that can snap", () => {
    expect(
      defaultWatchEntityIds(
        {
          version: 1,
          id: "home",
          title: "Home",
          favorites: ["light.kitchen", "camera.front"],
          sections: [],
        },
        { "light.kitchen": kitchen },
      ),
    ).toEqual(["light.kitchen"]);
  });

  it("groups selected entities by area", () => {
    const catalog = buildWatchCatalog({
      entities: { "light.kitchen": kitchen },
      areas: [{ area_id: "kitchen", name: "Kitchen" }],
      areaByEntity: { "light.kitchen": "kitchen" },
      selectedIds: ["light.kitchen", "camera.front"],
      atHome: true,
      currentAreaId: "kitchen",
    });
    expect(catalog.entities).toEqual([
      {
        id: "light.kitchen",
        name: "Kitchen Light",
        areaId: "kitchen",
        domain: "light",
      },
    ]);
    expect(catalog.areas).toEqual([{ id: "kitchen", name: "Kitchen" }]);
  });
});
