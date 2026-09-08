import { describe, expect, it } from "vitest";

import {
  buildWatchCatalog,
  buildWatchSnapshot,
  defaultWatchEntityIds,
  isControllableEntityId,
  isSnappableEntityId,
} from "./catalog";

function hass(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
) {
  return {
    entity_id: entityId,
    state,
    attributes: { friendly_name: entityId, ...attributes },
    last_changed: "",
    last_updated: "",
    context: { id: "", user_id: null, parent_id: null },
  };
}

const kitchen = hass("light.kitchen", "on", {
  friendly_name: "Kitchen Light",
  brightness: 128,
  supported_color_modes: ["brightness"],
});

const front = hass("lock.front", "unlocked", { friendly_name: "Front Door" });
const coded = hass("lock.gate", "locked", {
  friendly_name: "Gate",
  code_format: "number",
});
const movie = hass("scene.movie", "off", { friendly_name: "Movie Night" });

describe("watch catalog", () => {
  it("accepts lights, scenes, and locks, but not cameras", () => {
    expect(isSnappableEntityId("light.kitchen")).toBe(true);
    expect(isSnappableEntityId("scene.movie")).toBe(true);
    expect(isControllableEntityId("lock.front")).toBe(true);
    expect(isSnappableEntityId("lock.front")).toBe(true);
    expect(isSnappableEntityId("camera.front")).toBe(false);
  });

  it("defaults to dashboard favourites that can be controlled", () => {
    expect(
      defaultWatchEntityIds(
        {
          version: 1,
          id: "home",
          title: "Home",
          favorites: ["light.kitchen", "lock.front", "camera.front"],
          sections: [],
        },
        { "light.kitchen": kitchen, "lock.front": front },
      ),
    ).toEqual(["light.kitchen", "lock.front"]);
  });

  it("groups selected entities by area and records capabilities", () => {
    const catalog = buildWatchCatalog({
      entities: {
        "light.kitchen": kitchen,
        "lock.gate": coded,
        "camera.front": hass("camera.front", "idle"),
      },
      areas: [{ area_id: "kitchen", name: "Kitchen" }],
      areaByEntity: { "light.kitchen": "kitchen", "lock.gate": "kitchen" },
      selectedIds: ["light.kitchen", "lock.gate", "camera.front"],
      favoriteIds: ["light.kitchen"],
      atHome: true,
      currentAreaId: "kitchen",
    });
    expect(catalog.entities).toEqual([
      {
        id: "light.kitchen",
        name: "Kitchen Light",
        areaId: "kitchen",
        domain: "light",
        favorite: true,
        capabilities: { brightness: true },
      },
      {
        id: "lock.gate",
        name: "Gate",
        areaId: "kitchen",
        domain: "lock",
        favorite: false,
        capabilities: { lockCode: true },
      },
    ]);
    expect(catalog.areas).toEqual([{ id: "kitchen", name: "Kitchen" }]);
  });

  it("builds a compact snapshot with area rollups", () => {
    const catalog = buildWatchCatalog({
      entities: {
        "light.kitchen": kitchen,
        "lock.front": front,
        "scene.movie": movie,
      },
      areas: [
        { area_id: "kitchen", name: "Kitchen" },
        { area_id: "entry", name: "Entry" },
      ],
      areaByEntity: { "light.kitchen": "kitchen", "lock.front": "entry" },
      selectedIds: ["light.kitchen", "lock.front", "scene.movie"],
      atHome: false,
      currentAreaId: "kitchen",
    });
    const snapshot = buildWatchSnapshot({
      entities: {
        "light.kitchen": kitchen,
        "lock.front": front,
        "scene.movie": movie,
      },
      catalog,
      atHome: false,
      connected: true,
    });
    expect(snapshot.atHome).toBe(false);
    expect(snapshot.connected).toBe(true);
    expect(snapshot.summary).toEqual({
      lightsOn: 1,
      lockCount: 1,
      unlocked: 1,
    });
    expect(snapshot.areas.kitchen).toEqual({ lightsOn: 1, unlocked: 0 });
    expect(snapshot.areas.entry).toEqual({ lightsOn: 0, unlocked: 1 });
    expect(snapshot.states["light.kitchen"]?.state).toBe("on");
    expect(snapshot.states["light.kitchen"]?.brightness).toBe(50);
    expect(snapshot.states["lock.front"]?.state).toBe("unlocked");
  });
});
