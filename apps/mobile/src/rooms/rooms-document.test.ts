import { describe, expect, it } from "vitest";

import { commitAreaDocument, documentForArea } from "./rooms-document";

const living = { area_id: "living_room", name: "Living Room" };

describe("documentForArea", () => {
  it("uses a live area query when the room has not been edited", () => {
    const document = documentForArea(null, living);
    expect(document.sections).toEqual([
      {
        id: "living_room",
        title: "Living Room",
        source: { kind: "area", areaId: "living_room" },
      },
    ]);
  });

  it("returns the frozen explicit section after an edit", () => {
    const saved = commitAreaDocument(null, {
      version: 1,
      id: "mobile-rooms",
      title: "Living Room",
      sections: [
        {
          id: "living_room",
          title: "Living Room",
          source: {
            kind: "explicit",
            widgets: [
              {
                id: "living_room:light.lamp",
                type: "@ethio/core/light",
                config: { entity_id: "light.lamp" },
              },
            ],
          },
        },
      ],
    });
    const document = documentForArea(saved, living);
    expect(document.sections[0]?.source).toEqual({
      kind: "explicit",
      widgets: [
        {
          id: "living_room:light.lamp",
          type: "@ethio/core/light",
          config: { entity_id: "light.lamp" },
        },
      ],
    });
  });

  it("builds a valid one-section document for an unknown area", () => {
    const document = documentForArea(null, {
      area_id: "ghost",
      name: "ghost",
    });
    expect(document.sections).toHaveLength(1);
    expect(document.sections[0]?.id).toBe("ghost");
    expect(document.sections[0]?.source).toEqual({
      kind: "area",
      areaId: "ghost",
    });
  });
});

describe("commitAreaDocument", () => {
  it("keeps other rooms when freezing one", () => {
    const withKitchen = commitAreaDocument(null, {
      version: 1,
      id: "mobile-rooms",
      title: "Kitchen",
      sections: [
        {
          id: "kitchen",
          source: { kind: "area", areaId: "kitchen" },
        },
      ],
    });
    const next = commitAreaDocument(withKitchen, {
      version: 1,
      id: "mobile-rooms",
      title: "Living Room",
      sizes: { "living_room:light.lamp": "lg" },
      sections: [
        {
          id: "living_room",
          title: "Living Room",
          source: {
            kind: "explicit",
            widgets: [
              {
                id: "living_room:light.lamp",
                type: "@ethio/core/light",
                config: { entity_id: "light.lamp" },
              },
            ],
          },
        },
      ],
    });
    expect(next.sections.map((section) => section.id)).toEqual([
      "kitchen",
      "living_room",
    ]);
    expect(next.sizes).toEqual({ "living_room:light.lamp": "lg" });
  });
});
