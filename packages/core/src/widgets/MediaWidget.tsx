import { z } from "zod";

import { defineWidget } from "@ethio/plugin-sdk";

import { MediaWidget } from "./media/MediaWidget";

export const mediaConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
  artworkMode: z.enum(["default", "cover"]).default("default"),
});

export const mediaWidget = defineWidget({
  id: "@ethio/core/media",
  name: "Media",
  description:
    "Control a media player (HomePod, Sonos, Music Assistant, and more)",
  component: MediaWidget,
  configSchema: mediaConfigSchema,
  defaultConfig: { title: "", entity_id: "", artworkMode: "default" },
  defaultSize: { w: 4, h: 2, minW: 3, minH: 1, maxW: 8, maxH: 8 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 8, h: 8 },
  entityDomains: ["media_player"],
  capabilities: ["entity.read", "service.call"],
});
