import { describe, expect, it } from "vitest";

import {
  encodeWidgetHub,
  parseWidgetHub,
  webhookBodyForTarget,
} from "./hub-config";

describe("widget hub config", () => {
  it("round-trips the webhook the extension will POST with", () => {
    const encoded = encodeWidgetHub({
      webhookId: "hook-1",
      urls: ["http://192.168.1.10:8123", ""],
    });
    expect(parseWidgetHub(encoded)).toEqual({
      webhookId: "hook-1",
      urls: ["http://192.168.1.10:8123"],
    });
    expect(parseWidgetHub("")).toBeNull();
    expect(parseWidgetHub("{")).toBeNull();
  });

  it("builds the same call_service body the companion webhook uses", () => {
    expect(webhookBodyForTarget("toggle:light.sofa")).toEqual({
      type: "call_service",
      data: {
        domain: "light",
        service: "toggle",
        service_data: { entity_id: "light.sofa" },
      },
    });
    expect(webhookBodyForTarget("scene.movie")).toBeNull();
    expect(webhookBodyForTarget("scene:scene.movie")).toEqual({
      type: "call_service",
      data: {
        domain: "scene",
        service: "turn_on",
        service_data: { entity_id: "scene.movie" },
      },
    });
    expect(webhookBodyForTarget("todo:todo.shopping_list:uid-1")).toEqual({
      type: "call_service",
      data: {
        domain: "todo",
        service: "update_item",
        service_data: {
          entity_id: "todo.shopping_list",
          item: "uid-1",
          status: "completed",
        },
      },
    });
  });
});
