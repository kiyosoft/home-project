import { describe, expect, it } from "vitest";

import {
  cameraMjpegPath,
  cameraMjpegUrl,
  cameraStillPath,
  deriveCamera,
  requestCameraHlsUrl,
} from "./camera";
import type { HassEntity } from "./types";

function camera(
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity {
  return { entity_id: "camera.front_door", state, attributes };
}

describe("deriveCamera", () => {
  it("reads stream and power features", () => {
    const view = deriveCamera(
      camera("streaming", {
        supported_features: 3,
        brand: "DemoCam",
        access_token: "cam-token",
        entity_picture: "/api/camera_proxy/camera.front_door",
      }),
    );
    expect(view?.supportsOnOff).toBe(true);
    expect(view?.supportsStream).toBe(true);
    expect(view?.isStreaming).toBe(true);
    expect(view?.accessToken).toBe("cam-token");
  });
});

describe("camera paths", () => {
  it("prefers entity_picture for stills", () => {
    expect(cameraStillPath("camera.front_door", "/local/snap.jpg")).toBe(
      "/local/snap.jpg",
    );
    expect(cameraStillPath("camera.front_door")).toBe(
      "/api/camera_proxy/camera.front_door",
    );
  });

  it("builds an authed MJPEG URL", () => {
    expect(cameraMjpegPath("camera.front_door")).toBe(
      "/api/camera_proxy_stream/camera.front_door",
    );
    expect(
      cameraMjpegUrl("camera.front_door", "http://hub.local:8123", "cam-token"),
    ).toBe(
      "http://hub.local:8123/api/camera_proxy_stream/camera.front_door?token=cam-token",
    );
    expect(cameraMjpegUrl("camera.front_door", "http://hub.local:8123")).toBe(
      "http://hub.local:8123/api/camera_proxy_stream/camera.front_door",
    );
  });
});

describe("requestCameraHlsUrl", () => {
  it("signs a relative playlist path", async () => {
    const send = async (message: Record<string, unknown>) => {
      if (message.type === "camera/stream") {
        return { url: "/api/hls/x/playlist.m3u8" };
      }
      if (message.type === "auth/sign_path") {
        return { path: "/api/hls/x/playlist.m3u8?authSig=sig" };
      }
      throw new Error(`unexpected ${String(message.type)}`);
    };
    await expect(
      requestCameraHlsUrl(send, "camera.front_door", "http://hub.local:8123"),
    ).resolves.toBe(
      "http://hub.local:8123/api/hls/x/playlist.m3u8?authSig=sig",
    );
  });

  it("keeps an absolute playlist url", async () => {
    const send = async () => ({ url: "https://cdn.example/stream.m3u8" });
    await expect(
      requestCameraHlsUrl(send, "camera.front_door", "http://hub.local:8123"),
    ).resolves.toBe("https://cdn.example/stream.m3u8");
  });

  it("falls back unsigned when sign_path fails", async () => {
    const send = async (message: Record<string, unknown>) => {
      if (message.type === "camera/stream") {
        return { url: "/api/hls/x/playlist.m3u8" };
      }
      throw new Error("nope");
    };
    await expect(
      requestCameraHlsUrl(send, "camera.front_door", "http://hub.local:8123"),
    ).resolves.toBe("http://hub.local:8123/api/hls/x/playlist.m3u8");
  });
});
