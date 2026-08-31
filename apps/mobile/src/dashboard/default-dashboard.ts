import type { MobileDashboard, MobileSection } from "@ethio/mobile-schema";

export const DEFAULT_SECTION_ID = "home";
export const SCENES_SECTION_ID = "scenes";

const EMPTY_SCENES_SECTION: MobileSection = {
  id: SCENES_SECTION_ID,
  source: { kind: "scene", entities: [] },
};

/** Inserts the empty scenes section on documents saved before it existed. */
export function ensureScenesSection(
  document: MobileDashboard,
): MobileDashboard {
  if (document.sections.some((section) => section.source.kind === "scene")) {
    return document;
  }
  return {
    ...document,
    sections: [EMPTY_SCENES_SECTION, ...document.sections],
  };
}

/**
 * The document a phone shows before anyone adds a tile. Entities stay off
 * the screen until the user picks them, same as the web dashboard.
 */
export const DEFAULT_DASHBOARD: MobileDashboard = {
  version: 1,
  id: "mobile-default",
  title: "Home",
  sections: [
    EMPTY_SCENES_SECTION,
    {
      id: DEFAULT_SECTION_ID,
      source: { kind: "explicit", widgets: [] },
    },
  ],
};
