import type { AreaRegistryEntry } from "@ethio/ha-sdk";
import type { MobileDashboard } from "@ethio/mobile-schema";

export const ROOMS_DOCUMENT_ID = "mobile-rooms";

export const EMPTY_ROOMS_DASHBOARD: MobileDashboard = {
  version: 1,
  id: ROOMS_DOCUMENT_ID,
  title: "Rooms",
  sections: [],
};

type AreaRef = Pick<AreaRegistryEntry, "area_id" | "name">;

/**
 * A one-section dashboard for a single room. Unedited rooms stay an area
 * query so new devices on the hub still appear; a saved section wins.
 */
export function documentForArea(
  saved: MobileDashboard | null,
  area: AreaRef,
): MobileDashboard {
  const existing = saved?.sections.find(
    (section) => section.id === area.area_id,
  );
  return {
    version: 1,
    id: saved?.id ?? ROOMS_DOCUMENT_ID,
    title: area.name || area.area_id,
    sizes: saved?.sizes,
    sections: [
      existing ?? {
        id: area.area_id,
        title: area.name || undefined,
        source: { kind: "area", areaId: area.area_id },
      },
    ],
  };
}

/** Writes a room's one-section document back into the saved rooms dashboard. */
export function commitAreaDocument(
  saved: MobileDashboard | null,
  areaDocument: MobileDashboard,
): MobileDashboard {
  const section = areaDocument.sections[0];
  if (!section) return saved ?? EMPTY_ROOMS_DASHBOARD;
  const base = saved ?? EMPTY_ROOMS_DASHBOARD;
  const has = base.sections.some((entry) => entry.id === section.id);
  return {
    ...base,
    sizes: areaDocument.sizes,
    sections: has
      ? base.sections.map((entry) =>
          entry.id === section.id ? section : entry,
        )
      : [...base.sections, section],
  };
}
