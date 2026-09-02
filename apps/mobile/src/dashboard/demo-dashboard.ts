import { DEMO_ENTITY_IDS } from "@ethio/ha-sdk";
import type { MobileDashboard, MobileWidget } from "@ethio/mobile-schema";

import { DEFAULT_SECTION_ID, SCENES_SECTION_ID } from "@/dashboard/default-dashboard";

function w(
  id: string,
  type: string,
  config: Record<string, unknown>,
  size: MobileWidget["size"],
): MobileWidget {
  return { id, type, config, size };
}

/**
 * Demo Home mosaic matching the web seed: clock, weather, groups, area card,
 * plus Bedroom / Energy / Environment sections the header chips jump to.
 */
export const DEMO_DASHBOARD: MobileDashboard = {
  version: 1,
  id: "mobile-demo",
  title: "Home",
  sections: [
    {
      id: SCENES_SECTION_ID,
      source: {
        kind: "scene",
        entities: [DEMO_ENTITY_IDS.movieNight, DEMO_ENTITY_IDS.goodNight],
      },
    },
    {
      id: DEFAULT_SECTION_ID,
      source: {
        kind: "explicit",
        widgets: [
          w("w-clock", "@ethio/core/clock", { title: "" }, "lg"),
          w(
            "w-weather",
            "@ethio/core/weather",
            { entity_id: DEMO_ENTITY_IDS.weather },
            "lg",
          ),
          w(
            "w-media",
            "@ethio/core/media",
            { entity_id: DEMO_ENTITY_IDS.media, artworkMode: "default" },
            "md",
          ),
          w(
            "w-climate-sensors",
            "@ethio/core/climate-sensors",
            {
              title: "Climate Sensors",
              entity_ids: [...DEMO_ENTITY_IDS.climateSensors],
            },
            "md",
          ),
          w(
            "w-area",
            "@ethio/core/area",
            { title: "Living Room", area_id: DEMO_ENTITY_IDS.livingArea },
            "lg",
          ),
          w("w-batteries", "@ethio/core/batteries", { title: "Batteries" }, "md"),
          w(
            "w-climate",
            "@ethio/core/climate",
            { entity_id: DEMO_ENTITY_IDS.climate },
            "md",
          ),
          w(
            "w-lights",
            "@ethio/core/light",
            { title: "Lights", entity_id: DEMO_ENTITY_IDS.lights },
            "md",
          ),
          w(
            "w-scene",
            "@ethio/core/scene",
            { title: "Scenes", entity_id: DEMO_ENTITY_IDS.movieNight },
            "sm",
          ),
          w(
            "w-switches",
            "@ethio/core/toggle",
            { title: "Switches", entity_id: DEMO_ENTITY_IDS.switches },
            "sm",
          ),
          w(
            "w-blinds",
            "@ethio/core/cover",
            { title: "Blinds", entity_id: DEMO_ENTITY_IDS.blinds },
            "sm",
          ),
          w(
            "w-fan",
            "@ethio/core/fan",
            { entity_id: DEMO_ENTITY_IDS.fan },
            "sm",
          ),
          w(
            "w-locks",
            "@ethio/core/lock",
            { title: "Locks", entity_id: DEMO_ENTITY_IDS.locks },
            "sm",
          ),
          w(
            "w-door",
            "@ethio/core/entity-state",
            { title: "Front Door", entity_id: DEMO_ENTITY_IDS.frontEntry },
            "sm",
          ),
          w(
            "w-camera",
            "@ethio/core/camera",
            { entity_id: DEMO_ENTITY_IDS.camera },
            "lg",
          ),
        ],
      },
    },
    {
      id: "bedroom",
      title: "Bedroom",
      source: {
        kind: "explicit",
        widgets: [
          w(
            "b-light",
            "@ethio/core/light",
            { entity_id: DEMO_ENTITY_IDS.bedroomLight },
            "md",
          ),
          w(
            "b-temp",
            "@ethio/core/entity-state",
            { entity_id: "sensor.bedroom_temperature" },
            "sm",
          ),
          w(
            "b-scene",
            "@ethio/core/scene",
            { entity_id: DEMO_ENTITY_IDS.goodNight },
            "sm",
          ),
        ],
      },
    },
    {
      id: "energy",
      title: "Energy",
      source: {
        kind: "explicit",
        widgets: [
          w("e-batteries", "@ethio/core/batteries", { title: "Batteries" }, "md"),
        ],
      },
    },
    {
      id: "environment",
      title: "Environment",
      source: {
        kind: "explicit",
        widgets: [
          w(
            "n-weather",
            "@ethio/core/weather",
            { entity_id: DEMO_ENTITY_IDS.weather },
            "lg",
          ),
          w(
            "n-sensors",
            "@ethio/core/climate-sensors",
            { title: "Climate Sensors" },
            "md",
          ),
          w(
            "n-fan",
            "@ethio/core/fan",
            { entity_id: DEMO_ENTITY_IDS.fan },
            "sm",
          ),
        ],
      },
    },
  ],
};
