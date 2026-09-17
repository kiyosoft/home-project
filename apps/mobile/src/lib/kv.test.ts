import { describe, expect, it } from "vitest";

import { createKv, createMemoryBackend } from "./kv";

function memoryKv() {
  return createKv(createMemoryBackend());
}

describe("createKv", () => {
  it("round-trips JSON objects", () => {
    const kv = memoryKv();
    kv.setJson("doc", { id: "home", widgets: [1] });
    expect(kv.getJson("doc")).toEqual({ id: "home", widgets: [1] });
  });

  it("returns null for a missing or corrupt JSON value", () => {
    const kv = memoryKv();
    expect(kv.getJson("missing")).toBeNull();
    kv.setString("bad", "{");
    expect(kv.getJson("bad")).toBeNull();
  });

  it("stores flags as 1 and 0", () => {
    const kv = memoryKv();
    kv.setFlag("on", true);
    kv.setFlag("off", false);
    expect(kv.getString("on")).toBe("1");
    expect(kv.getString("off")).toBe("0");
    expect(kv.getFlag("on")).toBe(true);
    expect(kv.getFlag("off")).toBe(false);
    expect(kv.getFlag("missing")).toBeNull();
  });

  it("removes a key", () => {
    const kv = memoryKv();
    kv.setString("name", "kitchen");
    kv.remove("name");
    expect(kv.getString("name")).toBeNull();
  });
});
