import { DEMO_ENTITY_IDS, type HassEntities } from "@ethio/ha-sdk";

import { pickLiveEntityIds } from "@/lib/entities";
import { getWidgetOrThrow } from "@/plugins/registry";

import { packLayoutsSized } from "./layout";
import type { DashboardConfig, DashboardWidget } from "./types";

function withLayouts(
  widgets: DashboardWidget[],
  pageId: string,
  title: string,
): DashboardConfig {
  const layouts = packLayoutsSized(
    widgets.map((widget) => {
      const def = getWidgetOrThrow(widget.type);
      return {
        id: widget.id,
        size: {
          ...def.defaultSize,
          minW: def.minSize.w,
          minH: def.minSize.h,
          maxW: def.maxSize.w,
          maxH: def.maxSize.h,
        },
      };
    }),
  );

  return {
    id: "home",
    title: "My Home",
    header: {
      showTitle: true,
      showDate: true,
      showTime: true,
      timeFormat: "24h",
    },
    pages: [
      {
        id: pageId,
        title,
        layouts,
        widgets,
      },
    ],
  };
}

export function seedDemoDashboard(): DashboardConfig {
  const widgets: DashboardWidget[] = [
    {
      id: "w-text",
      type: "@ethio/core/text-card",
      config: {
        title: "Welcome",
        html: `<p>Hello, <strong>{{ state_attr('person.kidus', 'friendly_name') }}</strong> — you are <em>{{ states('person.kidus') }}</em>.</p><p>{% if is_state('binary_sensor.fasting', 'on') %}ዛሬ ጾም ነው{% else %}Enjoy your meal{% endif %}</p>`,
        vertical_align: "center",
        padding: "md",
        background_type: "color",
        background_color: "hsl(var(--muted))",
        background_image: "",
        background_fit: "cover",
      },
    },
    {
      id: "w1",
      type: "@ethio/core/entity-state",
      config: { entity_id: DEMO_ENTITY_IDS.sensor },
    },
    {
      id: "w2",
      type: "@ethio/core/toggle",
      config: { entity_id: DEMO_ENTITY_IDS.light },
    },
    {
      id: "w3",
      type: "@ethio/core/toggle",
      config: { entity_id: DEMO_ENTITY_IDS.switch },
    },
    {
      id: "w4",
      type: "@ethio/core/entity-state",
      config: { entity_id: DEMO_ENTITY_IDS.binarySensor },
    },
    {
      id: "w5",
      type: "@ethio/core/toggle",
      config: { entity_id: DEMO_ENTITY_IDS.inputBoolean },
    },
    {
      id: "w6",
      type: "@ethio/teamtracker/team-card",
      config: {
        entity_id: DEMO_ENTITY_IDS.teamtracker,
        show_league: true,
        show_league_logo: true,
        show_rank: true,
        home_side: "left",
        outline: false,
      },
    },
    {
      id: "w6b",
      type: "@ethio/sinksar/today",
      config: {
        entity_id: DEMO_ENTITY_IDS.sinksar,
        show_entries: true,
      },
    },
    {
      id: "w7",
      type: "@ethio/core/climate",
      config: { entity_id: DEMO_ENTITY_IDS.climate },
    },
    {
      id: "w8",
      type: "@ethio/core/person",
      config: { entity_id: DEMO_ENTITY_IDS.person },
    },
    {
      id: "w9",
      type: "@ethio/core/weather",
      config: { entity_id: DEMO_ENTITY_IDS.weather },
    },
    {
      id: "w10",
      type: "@ethio/core/cover",
      config: { entity_id: DEMO_ENTITY_IDS.cover },
    },
    {
      id: "w11",
      type: "@ethio/core/media",
      config: {
        entity_id: DEMO_ENTITY_IDS.media,
        artworkMode: "default",
      },
    },
    {
      id: "w12",
      type: "@ethio/core/todo",
      config: {
        entity_id: DEMO_ENTITY_IDS.todo,
        showCompleted: false,
        maxItems: 5,
      },
    },
  ];
  return withLayouts(widgets, "overview", "Overview");
}

export function seedLiveDashboard(entities: HassEntities): DashboardConfig {
  const picked = pickLiveEntityIds(entities);
  const widgets: DashboardWidget[] = [];

  if (picked.sensor) {
    widgets.push({
      id: "w1",
      type: "@ethio/core/entity-state",
      config: { entity_id: picked.sensor },
    });
  }
  if (picked.toggle) {
    widgets.push({
      id: "w2",
      type: "@ethio/core/toggle",
      config: { entity_id: picked.toggle },
    });
  }
  if (picked.toggleAlt) {
    widgets.push({
      id: "w3",
      type: "@ethio/core/toggle",
      config: { entity_id: picked.toggleAlt },
    });
  }

  if (widgets.length === 0) {
    widgets.push({
      id: "w1",
      type: "@ethio/core/entity-state",
      config: { entity_id: "" },
    });
  }

  return withLayouts(widgets, "overview", "Overview");
}
