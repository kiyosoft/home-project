import { definePlugin } from "@ethio/plugin-sdk";

import { teamCardWidget } from "./TeamCard";

export { teamCardConfigSchema, teamCardWidget } from "./TeamCard";

export const teamtrackerPlugin = definePlugin({
  id: "@ethio/teamtracker",
  name: "Team Tracker",
  widgets: [teamCardWidget],
});
