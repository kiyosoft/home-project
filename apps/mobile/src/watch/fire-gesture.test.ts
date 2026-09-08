import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMessagePromise = vi.fn();
const fireEventOnHub = vi.fn();

let mode: string | null = "live";
let registration: { deviceId: string; webhookId: string } | null = {
  deviceId: "phone-1",
  webhookId: "hook",
};

vi.mock("@/lib/webhook", () => ({
  fireEventOnHub: (...args: unknown[]) => fireEventOnHub(...args),
}));

vi.mock("@/store/ha-store", () => ({
  useHaStore: {
    getState: () => ({
      mode,
      sendMessagePromise,
      registration,
    }),
  },
}));

import { fireWatchGesture, parseWatchGesture } from "./fire-gesture";
import { WATCH_GESTURE_EVENT } from "./gestures";

describe("fireWatchGesture", () => {
  beforeEach(() => {
    sendMessagePromise.mockReset();
    fireEventOnHub.mockReset();
    sendMessagePromise.mockResolvedValue(undefined);
    fireEventOnHub.mockResolvedValue("sent");
    mode = "live";
    registration = { deviceId: "phone-1", webhookId: "hook" };
  });

  it("rejects an unknown motion", async () => {
    expect(await fireWatchGesture({ gesture: "clap", atHome: true, areaId: "" })).toEqual({
      ok: false,
    });
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });

  it("fires ethio_watch_gesture over the live socket", async () => {
    const result = await fireWatchGesture({
      gesture: "double_snap",
      atHome: true,
      areaId: "kitchen",
    });
    expect(result).toEqual({ ok: true, gesture: "double_snap" });
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "fire_event",
      event_type: WATCH_GESTURE_EVENT,
      event_data: {
        gesture: "double_snap",
        source: "watch",
        at_home: true,
        area_id: "kitchen",
        device_id: "phone-1",
      },
    });
    expect(fireEventOnHub).not.toHaveBeenCalled();
  });

  it("falls back to the mobile_app webhook", async () => {
    sendMessagePromise.mockRejectedValue(new Error("Not connected"));
    const result = await fireWatchGesture({
      gesture: "flick",
      atHome: false,
      areaId: "",
    });
    expect(result.ok).toBe(true);
    expect(fireEventOnHub).toHaveBeenCalledWith(WATCH_GESTURE_EVENT, {
      gesture: "flick",
      source: "watch",
      at_home: false,
      area_id: "",
      device_id: "phone-1",
    });
  });

  it("skips the hub in demo mode", async () => {
    mode = "demo";
    const result = await fireWatchGesture({
      gesture: "shake",
      atHome: true,
      areaId: "den",
    });
    expect(result).toEqual({ ok: true, gesture: "shake" });
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });

  it("parses a watch payload", () => {
    expect(parseWatchGesture({ gesture: "shake" })).toBe("shake");
    expect(parseWatchGesture({ gesture: "wave" })).toBeNull();
  });
});
