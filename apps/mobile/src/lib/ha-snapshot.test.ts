import { beforeEach, describe, expect, it } from "vitest";

import {
  clearHaSnapshot,
  loadHaSnapshot,
  saveHaSnapshot,
} from "./ha-snapshot";
import { kv } from "./kv-mmkv";
import { HA_SNAPSHOT_KEY } from "./kv-keys";

const sample = {
  entities: {
    "light.sofa": {
      entity_id: "light.sofa",
      state: "on",
      attributes: { friendly_name: "Sofa Light" },
    },
  },
  areas: [] as [],
  areaByEntity: {},
};

describe("ha snapshot", () => {
  beforeEach(() => {
    clearHaSnapshot();
  });

  it("round-trips the signed-in name", () => {
    saveHaSnapshot({
      ...sample,
      userName: "Kidus Solomon",
      userId: "user-1",
    });

    expect(loadHaSnapshot()).toMatchObject({
      userName: "Kidus Solomon",
      userId: "user-1",
      entities: {
        "light.sofa": { state: "on" },
      },
    });
  });

  it("loads snapshots that predate the user fields", () => {
    kv.setJson(HA_SNAPSHOT_KEY, sample);

    expect(loadHaSnapshot()).toMatchObject({
      userName: "",
      userId: "",
      entities: {
        "light.sofa": { entity_id: "light.sofa" },
      },
    });
  });
});
