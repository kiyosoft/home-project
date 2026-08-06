import { definePlugin } from "@ethio/plugin-sdk";

import { climateWidget } from "./widgets/ClimateWidget";
import { coverWidget } from "./widgets/CoverWidget";
import { entityStateWidget } from "./widgets/EntityStateWidget";
import { personWidget } from "./widgets/PersonWidget";
import { toggleWidget } from "./widgets/ToggleWidget";
import { weatherWidget } from "./widgets/WeatherWidget";

export { climateConfigSchema } from "./widgets/ClimateWidget";
export { coverConfigSchema } from "./widgets/CoverWidget";
export { entityStateConfigSchema } from "./widgets/EntityStateWidget";
export { personConfigSchema } from "./widgets/PersonWidget";
export { toggleConfigSchema } from "./widgets/ToggleWidget";
export { weatherConfigSchema } from "./widgets/WeatherWidget";

export const corePlugin = definePlugin({
  id: "@ethio/core",
  name: "Ethio Core",
  widgets: [
    entityStateWidget,
    toggleWidget,
    climateWidget,
    coverWidget,
    personWidget,
    weatherWidget,
  ],
});
