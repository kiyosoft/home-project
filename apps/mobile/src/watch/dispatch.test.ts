import { beforeEach, describe, expect, it, vi } from "vitest";

const callService = vi.fn().mockResolvedValue(undefined);
const callServiceOnHub = vi.fn();
const hapticToggle = vi.fn();

vi.mock("@/lib/haptics", () => ({
  hapticToggle: (...args: unknown[]) => hapticToggle(...args),
}));

vi.mock("@/lib/webhook", () => ({
  callServiceOnHub: (...args: unknown[]) => callServiceOnHub(...args),
}));

vi.mock("@/store/ha-store", () => ({
  useHaStore: { getState: () => haState() },
}));

vi.mock("@/store/dashboard-store", () => ({
  useDashboardStore: { getState: () => ({ document: null }) },
}));

vi.mock("./watch-store", () => ({
  useWatchStore: { getState: () => watchState() },
}));

import {
  dispatchWatchCommand,
  dispatchWatchToggle,
  parseWatchCommand,
} from "./dispatch";

let entities: Record<string, { state: string; attributes?: Record<string, unknown> }>;
let areaByEntity: Record<string, string>;
let entityIds: string[] | null;

function haState() {
  return { callService, entities, areaByEntity };
}

function watchState() {
  return { entityIds };
}

describe("dispatchWatchCommand", () => {
  beforeEach(() => {
    callService.mockClear();
    callServiceOnHub.mockClear();
    hapticToggle.mockClear();
    callService.mockResolvedValue(undefined);
    entities = {
      "light.kitchen": { state: "on" },
      "light.den": { state: "off" },
      "lock.front": { state: "locked" },
      "scene.movie_night": { state: "off" },
    };
    areaByEntity = { "light.kitchen": "kitchen", "light.den": "den" };
    entityIds = ["light.kitchen", "light.den", "lock.front", "scene.movie_night"];
  });

  it("toggles a light", async () => {
    const result = await dispatchWatchCommand({
      kind: "toggle",
      entityId: "light.kitchen",
    });
    expect(result.ok).toBe(true);
    expect(callService).toHaveBeenCalledWith("light", "toggle", {
      entity_id: "light.kitchen",
    });
  });

  it("turns a scene on", async () => {
    const result = await dispatchWatchCommand({
      kind: "activate",
      entityId: "scene.movie_night",
    });
    expect(result.ok).toBe(true);
    expect(callService).toHaveBeenCalledWith("scene", "turn_on", {
      entity_id: "scene.movie_night",
    });
  });

  it("maps a legacy toggle of a scene to turn_on", async () => {
    await dispatchWatchToggle("scene.movie_night");
    expect(callService).toHaveBeenCalledWith("scene", "turn_on", {
      entity_id: "scene.movie_night",
    });
  });

  it("unlocks from a lock command", async () => {
    const result = await dispatchWatchCommand({
      kind: "unlock",
      entityId: "lock.front",
    });
    expect(result.ok).toBe(true);
    expect(result.state).toBe("unlocking");
    expect(callService).toHaveBeenCalledWith("lock", "unlock", {
      entity_id: "lock.front",
    });
  });

  it("maps a legacy toggle of a locked door to unlock", async () => {
    const result = await dispatchWatchCommand({
      kind: "toggle",
      entityId: "lock.front",
    });
    expect(callService).toHaveBeenCalledWith("lock", "unlock", {
      entity_id: "lock.front",
    });
    expect(result.state).toBe("unlocking");
  });

  it("turns every wrist light off", async () => {
    const result = await dispatchWatchCommand({
      kind: "group",
      action: "lights_off",
    });
    expect(result.ok).toBe(true);
    expect(callService).toHaveBeenCalledWith("light", "turn_off", {
      entity_id: ["light.kitchen", "light.den"],
    });
  });

  it("scopes All Lights Off to a room", async () => {
    await dispatchWatchCommand({
      kind: "group",
      action: "lights_off",
      areaId: "kitchen",
    });
    expect(callService).toHaveBeenCalledWith("light", "turn_off", {
      entity_id: "light.kitchen",
    });
  });

  it("accepts a set payload for later brightness", async () => {
    const result = await dispatchWatchCommand({
      kind: "set",
      entityId: "light.kitchen",
      data: { brightness_pct: 40 },
    });
    expect(result.ok).toBe(true);
    expect(callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.kitchen",
      brightness_pct: 40,
    });
  });

  it("ignores a camera", async () => {
    const result = await dispatchWatchCommand({
      kind: "toggle",
      entityId: "camera.front",
    });
    expect(result.ok).toBe(false);
    expect(callService).not.toHaveBeenCalled();
  });

  it("parses a watch command payload", () => {
    expect(
      parseWatchCommand({
        kind: "group",
        action: "lights_on",
        areaId: "den",
      }),
    ).toEqual({ kind: "group", action: "lights_on", areaId: "den" });
    expect(parseWatchCommand({ kind: "toggle" })).toBeNull();
  });
});
