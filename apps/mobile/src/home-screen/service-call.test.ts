import { describe, expect, it, vi } from "vitest";

import { sendWidgetServiceCall } from "./deliver";
import {
  parseWidgetAction,
  serviceCallForTarget,
  targetFromWidgetEvent,
  toggleTarget,
} from "./types";

describe("home screen widget taps", () => {
  it("asks Home Assistant to toggle, not to guess the current state", () => {
    const target = toggleTarget("light.kitchen");
    expect(parseWidgetAction(target)).toEqual({
      kind: "toggle",
      entityId: "light.kitchen",
    });
    expect(
      serviceCallForTarget(target, { "light.kitchen": { state: "off" } }),
    ).toEqual({
      domain: "light",
      service: "toggle",
      entityId: "light.kitchen",
    });
    expect(
      serviceCallForTarget("toggle:light.kitchen", {
        "light.kitchen": { state: "on" },
      }),
    ).toEqual({
      domain: "light",
      service: "toggle",
      entityId: "light.kitchen",
    });
  });

  it("still flips an on light when the companion has no fresh state", () => {
    // After the user leaves the app the entity cache is often empty. Sending
    // turn_on against a light that is already on is a no-op on the hub.
    expect(serviceCallForTarget("toggle:light.kitchen", {})).toEqual({
      domain: "light",
      service: "toggle",
      entityId: "light.kitchen",
    });
  });

  it("ignores a missing or empty target", () => {
    expect(serviceCallForTarget(undefined, {})).toBeNull();
    expect(serviceCallForTarget("", {})).toBeNull();
    expect(parseWidgetAction(undefined)).toBeNull();
  });

  it("reads the button id from a nested nativeEvent payload", () => {
    expect(
      targetFromWidgetEvent({
        nativeEvent: { target: "toggle:light.kitchen" },
      }),
    ).toBe("toggle:light.kitchen");
    expect(
      serviceCallForTarget(
        targetFromWidgetEvent({ target: "toggle:light.kitchen" }),
        { "light.kitchen": { state: "off" } },
      ),
    ).toEqual({
      domain: "light",
      service: "toggle",
      entityId: "light.kitchen",
    });
  });
});

describe("sendWidgetServiceCall", () => {
  const call = {
    domain: "light",
    service: "toggle",
    entityId: "light.kitchen",
  };

  it("uses the live socket when it is up", async () => {
    const callService = vi.fn(async () => {});
    const callViaWebhook = vi.fn(async () => {});
    await sendWidgetServiceCall(call, { callService, callViaWebhook });
    expect(callService).toHaveBeenCalledWith("light", "toggle", {
      entity_id: "light.kitchen",
    });
    expect(callViaWebhook).not.toHaveBeenCalled();
  });

  it("falls through to the webhook when the socket is gone", async () => {
    const callService = vi.fn(async () => {
      throw new Error("Not connected");
    });
    const callViaWebhook = vi.fn(async () => {});
    await sendWidgetServiceCall(call, { callService, callViaWebhook });
    expect(callViaWebhook).toHaveBeenCalledWith(call);
  });
});
