import { defineWidget } from "@ethio/plugin-sdk";

import { TextCardWidget } from "./text-card/TextCardWidget";
import { textCardConfigSchema } from "./text-card/text-card-config";

export { textCardConfigSchema } from "./text-card/text-card-config";

export const textCardWidget = defineWidget({
  id: "@ethio/core/text-card",
  name: "Text Card",
  description: "Rich text with entity templates and inline conditionals",
  component: TextCardWidget,
  configSchema: textCardConfigSchema,
  defaultConfig: textCardConfigSchema.parse({}),
  defaultSize: { w: 4, h: 3, minW: 2, minH: 1, maxW: 12, maxH: 8 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 12, h: 8 },
  capabilities: ["entity.read"],
});
