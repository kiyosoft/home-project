import { definePlugin } from "@ethio/plugin-sdk";

import { alarmWidget } from "./widgets/AlarmWidget";
import { calendarWidget } from "./widgets/CalendarWidget";
import { cameraWidget } from "./widgets/CameraWidget";
import { climateWidget } from "./widgets/ClimateWidget";
import { coverWidget } from "./widgets/CoverWidget";
import { entityStateWidget } from "./widgets/EntityStateWidget";
import { lightWidget } from "./widgets/LightWidget";
import { lockWidget } from "./widgets/LockWidget";
import { mediaWidget } from "./widgets/MediaWidget";
import { personWidget } from "./widgets/PersonWidget";
import { textCardWidget } from "./widgets/TextCardWidget";
import { todoWidget } from "./widgets/TodoWidget";
import { toggleWidget } from "./widgets/ToggleWidget";
import { weatherWidget } from "./widgets/WeatherWidget";

export { alarmConfigSchema } from "./widgets/AlarmWidget";
export { calendarConfigSchema } from "./widgets/CalendarWidget";
export { cameraConfigSchema } from "./widgets/CameraWidget";
export { climateConfigSchema } from "./widgets/ClimateWidget";
export { coverConfigSchema } from "./widgets/CoverWidget";
export { entityStateConfigSchema } from "./widgets/EntityStateWidget";
export { lightConfigSchema } from "./widgets/LightWidget";
export { lockConfigSchema } from "./widgets/LockWidget";
export { mediaConfigSchema } from "./widgets/MediaWidget";
export { personConfigSchema } from "./widgets/PersonWidget";
export { textCardConfigSchema } from "./widgets/TextCardWidget";
export { TextCardBody } from "./widgets/text-card/TextCardBody";
export { todoConfigSchema } from "./widgets/TodoWidget";
export { toggleConfigSchema } from "./widgets/ToggleWidget";
export { weatherConfigSchema } from "./widgets/WeatherWidget";

export { ColorStrip, Slider, Switch, useServiceValue } from "./ui";
export type {
  ColorStripProps,
  ServiceValueBinding,
  SliderProps,
  SliderSize,
  SwitchProps,
  SwitchSize,
} from "./ui";

export const corePlugin = definePlugin({
  id: "@ethio/core",
  name: "Ethio Core",
  widgets: [
    entityStateWidget,
    toggleWidget,
    lightWidget,
    climateWidget,
    coverWidget,
    mediaWidget,
    cameraWidget,
    lockWidget,
    alarmWidget,
    calendarWidget,
    personWidget,
    weatherWidget,
    todoWidget,
    textCardWidget,
  ],
});
