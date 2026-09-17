import { describe, expect, it } from "vitest";

import { escapeHtmlAttr, hubOrigin, mjpegPlayerHtml } from "./mjpeg-html";

describe("mjpegPlayerHtml", () => {
  it("escapes query strings so the token stays in the src attribute", () => {
    const src =
      "http://hub.local:8123/api/camera_proxy_stream/camera.front?token=a&b=1";
    expect(escapeHtmlAttr(src)).toContain("&amp;");
    expect(mjpegPlayerHtml(src)).toContain(
      'src="http://hub.local:8123/api/camera_proxy_stream/camera.front?token=a&amp;b=1"',
    );
    expect(hubOrigin(src)).toBe("http://hub.local:8123/");
  });
});
