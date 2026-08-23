import type { AreaRegistryEntry } from "@ethio/ha-sdk";
import type { MobileDashboard, MobileSection } from "@ethio/mobile-schema";

/**
 * Fallback grouping for entities no area claims. A domain section is titled
 * after its first domain, so the leading entry doubles as the group label.
 */
export const DEFAULT_DOMAIN_GROUPS: { id: string; domains: string[] }[] = [
  { id: "lights", domains: ["light"] },
  { id: "climate", domains: ["climate"] },
  { id: "covers", domains: ["cover"] },
  { id: "locks", domains: ["lock"] },
  { id: "switches", domains: ["switch", "input_boolean"] },
  { id: "media", domains: ["media_player"] },
  { id: "sensors", domains: ["sensor", "binary_sensor"] },
];

/**
 * The document a phone shows before anyone edits it: one section per Home
 * Assistant area, then domain sections that sweep up whatever had no area.
 */
export function buildDefaultDashboard(
  areas: AreaRegistryEntry[],
): MobileDashboard {
  const areaSections: MobileSection[] = areas.map((area) => ({
    id: `area-${area.area_id}`,
    source: { kind: "area", areaId: area.area_id },
  }));

  const domainSections: MobileSection[] = DEFAULT_DOMAIN_GROUPS.map((group) => ({
    id: `domain-${group.id}`,
    source: { kind: "domain", domains: group.domains },
  }));

  return {
    version: 1,
    id: "mobile-default",
    title: "Home",
    sections: [...areaSections, ...domainSections],
  };
}
