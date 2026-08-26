import type { MobileDashboard } from "@ethio/mobile-schema";

export const DEFAULT_SECTION_ID = "home";

/**
 * The document a phone shows before anyone adds a tile. Entities stay off
 * the screen until the user picks them, same as the web dashboard.
 */
export const DEFAULT_DASHBOARD: MobileDashboard = {
  version: 1,
  id: "mobile-default",
  title: "Home",
  sections: [
    {
      id: DEFAULT_SECTION_ID,
      source: { kind: "explicit", widgets: [] },
    },
  ],
};
