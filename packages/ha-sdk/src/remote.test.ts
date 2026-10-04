import { describe, expect, it } from "vitest";

import { deriveRemote, remotePress, remoteSeesTv, showsTvRemote } from "./remote";

describe("deriveRemote", () => {
  it("reads the current activity and the activity list", () => {
    expect(
      deriveRemote({
        entity_id: "remote.tv",
        state: "on",
        attributes: {
          current_activity: "YouTube",
          activity_list: ["YouTube", "TV", ""],
        },
      }),
    ).toEqual({
      entityId: "remote.tv",
      isOn: true,
      activity: "YouTube",
      activities: ["YouTube", "TV"],
    });
  });

  it("treats a foreground app as the TV being on", () => {
    expect(
      deriveRemote({
        entity_id: "remote.tv",
        state: "off",
        attributes: { current_activity: "YouTube" },
      })?.isOn,
    ).toBe(true);
  });
});

describe("remoteSeesTv", () => {
  it("follows the media player when the remote entity stays off", () => {
    const remote = {
      entity_id: "remote.living_room_tv",
      state: "off",
      attributes: {},
    };
    expect(
      remoteSeesTv(remote, {
        "media_player.living_room_tv": {
          entity_id: "media_player.living_room_tv",
          state: "playing",
          attributes: { app_name: "YouTube" },
        },
      }),
    ).toBe(true);
  });
});

describe("showsTvRemote", () => {
  it("shows for a TV and hides a speaker", () => {
    expect(
      showsTvRemote({
        entity_id: "media_player.living_room_tv",
        state: "on",
        attributes: { device_class: "tv" },
      }),
    ).toBe(true);
    expect(
      showsTvRemote({
        entity_id: "media_player.homepod",
        state: "playing",
        attributes: { device_class: "speaker" },
      }),
    ).toBe(false);
    expect(
      showsTvRemote({
        entity_id: "remote.living_room_tv",
        state: "on",
        attributes: {},
      }),
    ).toBe(true);
  });
});
describe("remotePress", () => {
  it("sends the key names each integration accepts", () => {
    expect(remotePress("samsungtv", "up", "remote.tv")).toEqual({
      domain: "remote",
      service: "send_command",
      data: { entity_id: "remote.tv", command: ["KEY_UP"] },
    });
    expect(remotePress("androidtv_remote", "ok", "remote.tv")).toEqual({
      domain: "remote",
      service: "send_command",
      data: { entity_id: "remote.tv", command: ["DPAD_CENTER"] },
    });
    expect(remotePress("webostv", "up", "media_player.tv")).toEqual({
      domain: "webostv",
      service: "button",
      data: { entity_id: "media_player.tv", button: "UP" },
    });
    expect(remotePress("webostv", "powerOff", "media_player.tv")).toEqual({
      domain: "media_player",
      service: "turn_off",
      data: { entity_id: "media_player.tv" },
    });
    expect(remotePress("cast", "up", "media_player.speaker")).toBeNull();
  });
});
