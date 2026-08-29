import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAppData,
  fireWebhookEvent,
  MobileAppError,
  parsePushNotification,
  updateRegistration,
} from "./mobile-app";

/**
 * These cover the two places where Home Assistant's contract is easy to break
 * without anything appearing to go wrong: the `app_data` object, which Core
 * replaces wholesale rather than merging, and the webhook responses, where a
 * 200 means different things depending on the command.
 */

const UPDATE = {
  appVersion: "1.0.0",
  deviceName: "iPhone",
  manufacturer: "Apple",
  model: "iPhone15,2",
  appData: { pushWebsocketChannel: true },
};

/** What Core echoes back from a successful `update_registration`. */
const SAFE_REGISTRATION = {
  app_data: { push_websocket_channel: true },
  app_id: "io.ethiohome.app",
  app_name: "Ethio Home",
  app_version: "1.0.0",
  device_name: "iPhone",
  manufacturer: "Apple",
  model: "iPhone15,2",
  os_version: "18.0",
  supports_encryption: false,
};

function reply(body: string, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildAppData", () => {
  it("always claims the websocket channel", () => {
    // Core replaces app_data rather than merging it, so an update that leaves
    // this out silently switches off notifications to the running app.
    expect(buildAppData({ pushWebsocketChannel: true })).toEqual({
      push_websocket_channel: true,
    });
  });

  it("sends the token and url together", () => {
    expect(
      buildAppData({
        pushWebsocketChannel: true,
        pushToken: "ExponentPushToken[abc]",
        pushUrl: "http://172.30.32.1:8100/api/push/s3cret",
      }),
    ).toEqual({
      push_websocket_channel: true,
      push_token: "ExponentPushToken[abc]",
      push_url: "http://172.30.32.1:8100/api/push/s3cret",
    });
  });

  it.each([
    ["only a token", "ExponentPushToken[abc]", undefined],
    ["only a url", undefined, "http://relay/api/push/s3cret"],
    ["a blank token", "   ", "http://relay/api/push/s3cret"],
    ["a blank url", "ExponentPushToken[abc]", "   "],
  ])("omits both given %s", (_label, pushToken, pushUrl) => {
    // `vol.Inclusive` fails the whole schema when one of the pair is missing,
    // and a failed schema takes the rest of the registration down with it.
    const appData = buildAppData({
      pushWebsocketChannel: true,
      pushToken,
      pushUrl,
    });

    expect(appData).not.toHaveProperty("push_token");
    expect(appData).not.toHaveProperty("push_url");
  });
});

describe("updateRegistration", () => {
  it("accepts the registration Core echoes back", async () => {
    reply(JSON.stringify(SAFE_REGISTRATION));

    await expect(
      updateRegistration({
        baseUrl: "http://ha.local",
        webhookId: "hook",
        update: UPDATE,
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects the empty object Core returns for an invalid payload", async () => {
    // Core's schema decorator logs the problem its side and answers 200 `{}`.
    // Reading that as success is how a `push_url` that fails `cv.url` leaves
    // the phone reporting that push is on while Home Assistant kept nothing.
    reply("{}");

    await expect(
      updateRegistration({
        baseUrl: "http://ha.local",
        webhookId: "hook",
        update: UPDATE,
      }),
    ).rejects.toMatchObject({ kind: "rejected" });
  });

  it("treats an empty body as a registration Core has forgotten", async () => {
    // The webhook endpoint answers 200 with no body for ids it has no handler
    // for, which is the only way to detect one.
    reply("");

    await expect(
      updateRegistration({
        baseUrl: "http://ha.local",
        webhookId: "hook",
        update: UPDATE,
      }),
    ).rejects.toMatchObject({ kind: "not-loaded" });
  });

  it("treats 410 as a deleted registration", async () => {
    reply("", 410);

    await expect(
      updateRegistration({
        baseUrl: "http://ha.local",
        webhookId: "hook",
        update: UPDATE,
      }),
    ).rejects.toMatchObject({ kind: "not-loaded" });
  });
});

describe("fireWebhookEvent", () => {
  it("accepts an empty object, which is what success looks like here", async () => {
    // The asymmetry matters: `fire_event` answers `{}` on success, so the rule
    // that `updateRegistration` uses would reject every delivered action.
    reply("{}");

    await expect(
      fireWebhookEvent({
        baseUrl: "http://ha.local",
        webhookId: "hook",
        eventType: "mobile_app_notification_action",
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects an empty body, which means nobody handled it", async () => {
    reply("");

    await expect(
      fireWebhookEvent({
        baseUrl: "http://ha.local",
        webhookId: "hook",
        eventType: "mobile_app_notification_action",
      }),
    ).rejects.toBeInstanceOf(MobileAppError);
  });
});

describe("parsePushNotification", () => {
  it("reads the tag and confirm id the inbox dedupes on", () => {
    // The confirm id is the only identifier shared by both delivery routes,
    // so a notification sent twice collapses to one entry in Activity.
    const parsed = parsePushNotification({
      message: "Front door unlocked",
      title: "Home",
      hass_confirm_id: "abc123",
      data: { tag: "door", url: "/lovelace/0" },
    });

    expect(parsed).toMatchObject({
      message: "Front door unlocked",
      title: "Home",
      confirmId: "abc123",
      tag: "door",
    });
  });

  it("keeps the whole data object for the tap handler", () => {
    const parsed = parsePushNotification({
      message: "Hi",
      data: { url: "https://example.com", action_data: { id: 7 } },
    });

    expect(parsed?.data).toEqual({
      url: "https://example.com",
      action_data: { id: 7 },
    });
  });

  it("parses the actions that become notification buttons", () => {
    const parsed = parsePushNotification({
      message: "Doorbell",
      data: {
        actions: [
          { action: "OPEN", title: "Open" },
          { action: "IGNORE" },
          { title: "no action so unusable" },
        ],
      },
    });

    expect(parsed?.actions).toEqual([
      { action: "OPEN", title: "Open" },
      // Falls back to the identifier so the button still has a label.
      { action: "IGNORE", title: "IGNORE" },
    ]);
  });

  it.each([
    ["no message", { title: "Home" }],
    ["an empty message", { message: "   " }],
    ["not an object", "nope"],
  ])("declines a payload with %s", (_label, raw) => {
    expect(parsePushNotification(raw)).toBeNull();
  });

  it("reads Android importance and a named channel", () => {
    const parsed = parsePushNotification({
      message: "Motion",
      data: { channel: "Motion", importance: "max" },
    });
    expect(parsed).toMatchObject({
      channel: "Motion",
      importance: "max",
      interruption: "active",
    });
  });

  it("maps FCM priority when importance is omitted", () => {
    expect(
      parsePushNotification({
        message: "Ping",
        data: { priority: "low" },
      })?.importance,
    ).toBe("low");
  });

  it("reads an iOS interruption level from the push block", () => {
    const parsed = parsePushNotification({
      message: "Leak",
      data: { push: { "interruption-level": "time-sensitive" } },
    });
    expect(parsed?.interruption).toBe("time-sensitive");
  });

  it("treats the legacy critical sound flag as a critical interruption", () => {
    const parsed = parsePushNotification({
      message: "Smoke",
      data: { push: { sound: { name: "default", critical: 1, volume: 1 } } },
    });
    expect(parsed?.interruption).toBe("critical");
  });

  it("honours presentation_options when the app is in the foreground", () => {
    const parsed = parsePushNotification({
      message: "Quiet",
      data: { presentation_options: ["alert"] },
    });
    expect(parsed?.presentation).toEqual({
      alert: true,
      sound: false,
      badge: false,
    });
  });
});
