import { describe, expect, it } from "vitest";

import { pickCameraLiveMode } from "./live-mode";

const mjpeg = "http://hub/api/camera_proxy_stream/camera.front";
const hls = "http://hub/api/hls/x/playlist.m3u8";

describe("pickCameraLiveMode", () => {
  it("uses HLS for a STREAM camera (generic RTSP), not MJPEG", () => {
    expect(
      pickCameraLiveMode({
        streaming: true,
        supportsStream: true,
        sound: false,
        hlsUri: hls,
        hlsFailed: false,
        mjpegUri: mjpeg,
        mjpegFailed: false,
      }),
    ).toBe("hls");
  });

  it("waits for the HLS playlist before touching MJPEG on STREAM cameras", () => {
    expect(
      pickCameraLiveMode({
        streaming: true,
        supportsStream: true,
        sound: false,
        hlsUri: null,
        hlsFailed: false,
        mjpegUri: mjpeg,
        mjpegFailed: false,
      }),
    ).toBe("wait");
  });

  it("falls back to MJPEG when HLS fails", () => {
    expect(
      pickCameraLiveMode({
        streaming: true,
        supportsStream: true,
        sound: false,
        hlsUri: hls,
        hlsFailed: true,
        mjpegUri: mjpeg,
        mjpegFailed: false,
      }),
    ).toBe("mjpeg");
  });

  it("reports none when HLS and MJPEG both fail", () => {
    expect(
      pickCameraLiveMode({
        streaming: true,
        supportsStream: true,
        sound: false,
        hlsUri: null,
        hlsFailed: true,
        mjpegUri: mjpeg,
        mjpegFailed: true,
      }),
    ).toBe("none");
  });

  it("keeps MJPEG live for cameras without STREAM", () => {
    expect(
      pickCameraLiveMode({
        streaming: true,
        supportsStream: false,
        sound: false,
        hlsUri: null,
        hlsFailed: false,
        mjpegUri: mjpeg,
        mjpegFailed: false,
      }),
    ).toBe("mjpeg");
  });
});
