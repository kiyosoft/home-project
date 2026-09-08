import { dispatchWidgetTarget } from "@/home-screen/dispatch";
import { sceneTarget, toggleTarget } from "@/home-screen/types";
import { entityDomain } from "@/store/use-entity";

import { isSnappableDomain } from "./types";

/** Watch asks for an entity; the phone already knows how to reach the hub. */
export function dispatchWatchToggle(entityId: string): void {
  const domain = entityDomain(entityId);
  if (!isSnappableDomain(domain) || !entityId) return;
  const target =
    domain === "scene" || domain === "script"
      ? sceneTarget(entityId)
      : toggleTarget(entityId);
  dispatchWidgetTarget(target);
}
