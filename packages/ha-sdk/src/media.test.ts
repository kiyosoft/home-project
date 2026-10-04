import { describe, expect, it } from "vitest";

import { deriveMedia } from "./media";
import type { HassEntity } from "./types";

function player(
  state: string,
  attributes: Record<string, unknown>,
): HassEntity {
  return { entity_id: "media_player.tv", state, attributes };
}

describe("deriveMedia", () => {
  it("labels a TV by the app when YouTube sends no video title", () => {
    expect(deriveMedia(player("playing", { app_name: "YouTube" }))?.title).toBe(
      "YouTube",
    );
  });

  it("lists TV inputs from source_list", () => {
    const view = deriveMedia(
      player("on", { source: "YouTube", source_list: ["HDMI 1", "YouTube", ""] }),
    );
    expect(view?.source).toBe("YouTube");
    expect(view?.sources).toEqual(["HDMI 1", "YouTube"]);
  });

  it("keeps a real track title ahead of the app name", () => {
    expect(
      deriveMedia(
        player("playing", {
          media_title: "Chill Station",
          app_name: "Music Assistant",
        }),
      )?.title,
    ).toBe("Chill Station");
  });
});
