import { describe, expect, it } from "vitest";

import { isLiveSession } from "./session";

describe("isLiveSession", () => {
  it("treats demo as live even without a socket", () => {
    expect(isLiveSession("demo", "idle")).toBe(true);
    expect(isLiveSession("demo", "connecting")).toBe(true);
  });

  it("only treats a live hub as live while connected", () => {
    expect(isLiveSession("live", "connected")).toBe(true);
    expect(isLiveSession("live", "connecting")).toBe(false);
    expect(isLiveSession("live", "reconnecting")).toBe(false);
    expect(isLiveSession("live", "error")).toBe(false);
    expect(isLiveSession("live", "idle")).toBe(false);
    expect(isLiveSession(null, "connecting")).toBe(false);
  });
});
