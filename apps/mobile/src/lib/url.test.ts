import { describe, expect, it } from "vitest";

import { isLocalUrl } from "./url";

describe("isLocalUrl", () => {
  it("treats LAN and .local hubs as local", () => {
    expect(isLocalUrl("http://homeassistant.local:8123")).toBe(true);
    expect(isLocalUrl("http://192.168.8.20:8123")).toBe(true);
  });

  it("treats reverse tunnels as remote", () => {
    expect(isLocalUrl("https://example.share.zrok.io")).toBe(false);
    expect(isLocalUrl("https://abc.ui.nabu.casa")).toBe(false);
  });
});
