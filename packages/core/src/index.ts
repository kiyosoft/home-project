import { definePlugin } from "@ethio/plugin-sdk";

import { alarmWidget } from "./widgets/AlarmWidget";
import { areaWidget } from "./widgets/AreaWidget";
import { batteriesWidget } from "./widgets/BatteriesWidget";
import { calendarWidget } from "./widgets/CalendarWidget";
import { cameraWidget } from "./widgets/CameraWidget";
import { climateWidget } from "./widgets/ClimateWidget";
import { climateSensorsWidget } from "./widgets/ClimateSensorsWidget";
import { clockWidget } from "./widgets/ClockWidget";
import { coverWidget } from "./widgets/CoverWidget";
import { entityStateWidget } from "./widgets/EntityStateWidget";
import { fanWidget } from "./widgets/FanWidget";
import { lightWidget } from "./widgets/LightWidget";
import { lockWidget } from "./widgets/LockWidget";
import { mediaWidget } from "./widgets/MediaWidget";
import { personWidget } from "./widgets/PersonWidget";
import { sceneWidget } from "./widgets/SceneWidget";
import { textCardWidget } from "./widgets/TextCardWidget";
import { todoWidget } from "./widgets/TodoWidget";
import { toggleWidget } from "./widgets/ToggleWidget";
import { weatherWidget } from "./widgets/WeatherWidget";

export { alarmConfigSchema } from "./widgets/AlarmWidget";
export { areaConfigSchema } from "./widgets/AreaWidget";
export { batteriesConfigSchema } from "./widgets/BatteriesWidget";
export { calendarConfigSchema } from "./widgets/CalendarWidget";
export { cameraConfigSchema } from "./widgets/CameraWidget";
export { climateConfigSchema } from "./widgets/ClimateWidget";
export { climateSensorsConfigSchema } from "./widgets/ClimateSensorsWidget";
export { clockConfigSchema } from "./widgets/ClockWidget";
export { coverConfigSchema } from "./widgets/CoverWidget";
export { entityStateConfigSchema } from "./widgets/EntityStateWidget";
export { fanConfigSchema } from "./widgets/FanWidget";
export { lightConfigSchema } from "./widgets/LightWidget";
export { lockConfigSchema } from "./widgets/LockWidget";
export { mediaConfigSchema } from "./widgets/MediaWidget";
export { personConfigSchema } from "./widgets/PersonWidget";
export { sceneConfigSchema } from "./widgets/SceneWidget";
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
    clockWidget,
    weatherWidget,
    areaWidget,
    batteriesWidget,
    climateSensorsWidget,
    sceneWidget,
    fanWidget,
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
    todoWidget,
    textCardWidget,
  ],
});
