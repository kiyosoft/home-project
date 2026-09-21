import { describe, expect, it, vi } from "vitest";

import {
  deliverWidgetWebhook,
  sendWidgetServiceCall,
} from "./deliver";
import {
  alreadyDispatched,
  EMPTY_HOME_PROPS,
  parseWidgetAction,
  serviceCallForTarget,
  takePendingTarget,
  targetFromWidgetEvent,
  todoTarget,
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

  it("completes a to-do item with its uid", () => {
    const target = todoTarget("todo.shopping_list", "uid-1");
    expect(parseWidgetAction(target)).toEqual({
      kind: "todo",
      entityId: "todo.shopping_list",
      uid: "uid-1",
    });
    expect(serviceCallForTarget(target, {})).toEqual({
      domain: "todo",
      service: "update_item",
      entityId: "todo.shopping_list",
      serviceData: {
        entity_id: "todo.shopping_list",
        item: "uid-1",
        status: "completed",
      },
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

describe("takePendingTarget", () => {
  it("turns a timeline pendingTarget into the same service call as a listener event", () => {
    const props = {
      ...EMPTY_HOME_PROPS,
      pendingTarget: "toggle:light.kitchen",
    };
    const taken = takePendingTarget(props);
    expect(taken).not.toBeNull();
    expect(
      serviceCallForTarget(taken?.target, {
        "light.kitchen": { state: "off" },
      }),
    ).toEqual(
      serviceCallForTarget(
        targetFromWidgetEvent({ target: "toggle:light.kitchen" }),
        { "light.kitchen": { state: "off" } },
      ),
    );
    expect(taken?.rest.pendingTarget).toBe("");
  });

  it("does not dispatch again after the pending target is cleared", () => {
    const first = takePendingTarget({
      ...EMPTY_HOME_PROPS,
      pendingTarget: "toggle:light.kitchen",
    });
    expect(first?.target).toBe("toggle:light.kitchen");
    expect(takePendingTarget(first?.rest)).toBeNull();
    expect(takePendingTarget({ ...EMPTY_HOME_PROPS, pendingTarget: "" })).toBeNull();
    expect(takePendingTarget(EMPTY_HOME_PROPS)).toBeNull();
  });

  it("skips a duplicate of the same target until the dedup window closes", () => {
    const target = toggleTarget("light.kitchen");
    const last = { target, at: 1_000 };
    expect(alreadyDispatched(last, target, 1_500)).toBe(true);
    expect(alreadyDispatched(last, target, 4_000)).toBe(false);
    expect(alreadyDispatched(last, "scene.movie", 1_500)).toBe(false);
    expect(alreadyDispatched(null, target, 1_500)).toBe(false);
  });
});

describe("deliverWidgetWebhook", () => {
  const call = {
    domain: "light",
    service: "toggle",
    entityId: "light.kitchen",
  };

  it("re-registers once when Home Assistant has forgotten this device", async () => {
    const send = vi
      .fn<(next: typeof call) => Promise<"sent" | "no-registration" | "unreachable">>()
      .mockResolvedValueOnce("no-registration")
      .mockResolvedValueOnce("sent");
    const recoverRegistration = vi.fn(async () => ({ webhookId: "new" }));
    await deliverWidgetWebhook(call, { send, recoverRegistration });
    expect(recoverRegistration).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not treat an unreachable hub as success", async () => {
    const send = vi.fn(async () => "unreachable" as const);
    const recoverRegistration = vi.fn(async () => null);
    await expect(
      deliverWidgetWebhook(call, { send, recoverRegistration }),
    ).rejects.toThrow("unreachable");
    expect(recoverRegistration).not.toHaveBeenCalled();
  });
});
