import { definePlugin } from "@ethio/plugin-sdk";

import { sinksarTodayWidget } from "./SinksarToday";

export { sinksarTodayConfigSchema, sinksarTodayWidget } from "./SinksarToday";

export const sinksarPlugin = definePlugin({
  id: "@ethio/sinksar",
  name: "Sinksar",
  widgets: [sinksarTodayWidget],
});
