import { describe, expect, it } from "vitest";

import {
  parseWidgetAction,
  serviceCallForTarget,
  targetFromWidgetEvent,
  toggleTarget,
} from "./types";

describe("home screen widget taps", () => {
  it("turns a light on when the button target is off", () => {
    const target = toggleTarget("light.kitchen");
    expect(parseWidgetAction(target)).toEqual({
      kind: "toggle",
      entityId: "light.kitchen",
    });
    expect(
      serviceCallForTarget(target, { "light.kitchen": { state: "off" } }),
    ).toEqual({
      domain: "light",
      service: "turn_on",
      entityId: "light.kitchen",
    });
  });

  it("turns a light off when the button target is on", () => {
    expect(
      serviceCallForTarget("toggle:light.kitchen", {
        "light.kitchen": { state: "on" },
      }),
    ).toEqual({
      domain: "light",
      service: "turn_off",
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
      service: "turn_on",
      entityId: "light.kitchen",
    });
  });
});
