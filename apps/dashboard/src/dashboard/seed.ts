import { DEMO_ENTITY_IDS, type HassEntities } from "@ethio/ha-sdk";

import { pickLiveEntityIds } from "@/lib/entities";
import { getWidgetOrThrow } from "@/plugins/registry";

import { packLayoutsSized, type SizeHint } from "./layout";
import type {
  DashboardConfig,
  DashboardPage,
  DashboardWidget,
  GridItem,
  HeaderPillConfig,
  PageLayouts,
} from "./types";

const DEMO_HEADER_PILLS: HeaderPillConfig[] = [
  { entity_id: DEMO_ENTITY_IDS.person },
  { entity_id: DEMO_ENTITY_IDS.movieNight },
  {
    entity_id: DEMO_ENTITY_IDS.fasting,
    template:
      "{% if is_state('binary_sensor.fasting', 'on') %}ዛሬ ጾም ነው{% endif %}",
  },
];

function widgetSize(type: string): SizeHint {
  const def = getWidgetOrThrow(type);
  return {
    ...def.defaultSize,
    minW: def.minSize.w,
    minH: def.minSize.h,
    maxW: def.maxSize.w,
    maxH: def.maxSize.h,
  };
}

function cell(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  type: string,
): GridItem {
  const size = widgetSize(type);
  return {
    i: id,
    x,
    y,
    w,
    h,
    minW: size.minW,
    minH: size.minH,
    maxW: size.maxW,
    maxH: size.maxH,
  };
}

function scaleLayout(items: GridItem[], fromCols: number, toCols: number): GridItem[] {
  const factor = toCols / fromCols;
  return items.map((item) => ({
    ...item,
    x: Math.round(item.x * factor),
    w: Math.max(item.minW ?? 1, Math.round(item.w * factor)),
  }));
}

function layoutsFromSm(sm: GridItem[]): PageLayouts {
  return {
    sm,
    md: scaleLayout(sm, 4, 8),
    lg: scaleLayout(sm, 4, 12),
  };
}

function page(
  id: string,
  title: string,
  widgets: DashboardWidget[],
  sm: GridItem[],
): DashboardPage {
  return { id, title, widgets, layouts: layoutsFromSm(sm) };
}

function withLayouts(
  widgets: DashboardWidget[],
  pageId: string,
  title: string,
  pills?: HeaderPillConfig[],
): DashboardConfig {
  const layouts = packLayoutsSized(
    widgets.map((widget) => ({
      id: widget.id,
      size: widgetSize(widget.type),
    })),
  );

  return {
    id: "home",
    title: "Home",
    header: {
      showTitle: true,
      showDate: true,
      showTime: true,
      timeFormat: "24h",
      pills,
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
  const homeWidgets: DashboardWidget[] = [
    { id: "w-clock", type: "@ethio/core/clock", config: { title: "" } },
    {
      id: "w-weather",
      type: "@ethio/core/weather",
      config: { entity_id: DEMO_ENTITY_IDS.weather },
    },
    {
      id: "w-media",
      type: "@ethio/core/media",
      config: { entity_id: DEMO_ENTITY_IDS.media, artworkMode: "default" },
    },
    {
      id: "w-climate-sensors",
      type: "@ethio/core/climate-sensors",
      config: { title: "Climate Sensors", entity_ids: [...DEMO_ENTITY_IDS.climateSensors] },
    },
    {
      id: "w-area",
      type: "@ethio/core/area",
      config: { title: "Living Room", area_id: DEMO_ENTITY_IDS.livingArea },
    },
    { id: "w-batteries", type: "@ethio/core/batteries", config: { title: "Batteries" } },
    {
      id: "w-climate",
      type: "@ethio/core/climate",
      config: { entity_id: DEMO_ENTITY_IDS.climate },
    },
    {
      id: "w-lights",
      type: "@ethio/core/light",
      config: { title: "Lights", entity_id: DEMO_ENTITY_IDS.lights },
    },
    {
      id: "w-scene",
      type: "@ethio/core/scene",
      config: { title: "Scenes", entity_id: DEMO_ENTITY_IDS.movieNight },
    },
    {
      id: "w-switches",
      type: "@ethio/core/toggle",
      config: { title: "Switches", entity_id: DEMO_ENTITY_IDS.switches },
    },
    {
      id: "w-blinds",
      type: "@ethio/core/cover",
      config: { title: "Blinds", entity_id: DEMO_ENTITY_IDS.blinds },
    },
    {
      id: "w-fan",
      type: "@ethio/core/fan",
      config: { entity_id: DEMO_ENTITY_IDS.fan },
    },
    {
      id: "w-locks",
      type: "@ethio/core/lock",
      config: { title: "Locks", entity_id: DEMO_ENTITY_IDS.locks },
    },
    {
      id: "w-door",
      type: "@ethio/core/entity-state",
      config: { title: "Front Door", entity_id: DEMO_ENTITY_IDS.frontEntry },
    },
    {
      id: "w-camera",
      type: "@ethio/core/camera",
      config: { entity_id: DEMO_ENTITY_IDS.camera },
    },
  ];

  const homeSm: GridItem[] = [
    cell("w-clock", 0, 0, 2, 2, "@ethio/core/clock"),
    cell("w-weather", 2, 0, 2, 2, "@ethio/core/weather"),
    cell("w-media", 0, 2, 2, 2, "@ethio/core/media"),
    cell("w-climate-sensors", 2, 2, 2, 1, "@ethio/core/climate-sensors"),
    cell("w-batteries", 2, 3, 2, 1, "@ethio/core/batteries"),
    cell("w-area", 0, 4, 2, 2, "@ethio/core/area"),
    cell("w-climate", 2, 4, 2, 2, "@ethio/core/climate"),
    cell("w-lights", 0, 6, 2, 2, "@ethio/core/light"),
    cell("w-scene", 2, 6, 2, 1, "@ethio/core/scene"),
    cell("w-switches", 2, 7, 2, 1, "@ethio/core/toggle"),
    cell("w-blinds", 0, 8, 2, 1, "@ethio/core/cover"),
    cell("w-fan", 2, 8, 2, 1, "@ethio/core/fan"),
    cell("w-locks", 0, 9, 2, 1, "@ethio/core/lock"),
    cell("w-door", 2, 9, 2, 1, "@ethio/core/entity-state"),
    cell("w-camera", 0, 10, 2, 2, "@ethio/core/camera"),
  ];

  const bedroomWidgets: DashboardWidget[] = [
    {
      id: "b-light",
      type: "@ethio/core/light",
      config: { entity_id: DEMO_ENTITY_IDS.bedroomLight },
    },
    {
      id: "b-temp",
      type: "@ethio/core/entity-state",
      config: { entity_id: "sensor.bedroom_temperature" },
    },
    {
      id: "b-scene",
      type: "@ethio/core/scene",
      config: { entity_id: DEMO_ENTITY_IDS.goodNight },
    },
  ];

  const energyWidgets: DashboardWidget[] = [
    {
      id: "e-text",
      type: "@ethio/core/text-card",
      config: {
        title: "Energy",
        html: "<p>Energy monitoring widgets will live here.</p>",
        vertical_align: "center",
        padding: "md",
        background_type: "color",
        background_color: "hsl(var(--muted))",
        background_image: "",
        background_fit: "cover",
      },
    },
  ];

  const environmentWidgets: DashboardWidget[] = [
    {
      id: "n-weather",
      type: "@ethio/core/weather",
      config: { entity_id: DEMO_ENTITY_IDS.weather },
    },
    {
      id: "n-sensors",
      type: "@ethio/core/climate-sensors",
      config: { title: "Climate Sensors" },
    },
    { id: "n-fan", type: "@ethio/core/fan", config: { entity_id: DEMO_ENTITY_IDS.fan } },
  ];

  return {
    id: "home",
    title: "Home",
    header: {
      showTitle: true,
      showDate: true,
      showTime: true,
      timeFormat: "24h",
      pills: DEMO_HEADER_PILLS,
    },
    pages: [
      page("overview", "Home", homeWidgets, homeSm),
      page(
        "bedroom",
        "Bedroom",
        bedroomWidgets,
        [
          cell("b-light", 0, 0, 2, 2, "@ethio/core/light"),
          cell("b-temp", 2, 0, 2, 1, "@ethio/core/entity-state"),
          cell("b-scene", 2, 1, 2, 1, "@ethio/core/scene"),
        ],
      ),
      page(
        "energy",
        "Energy",
        energyWidgets,
        [cell("e-text", 0, 0, 4, 3, "@ethio/core/text-card")],
      ),
      page(
        "environment",
        "Environment",
        environmentWidgets,
        [
          cell("n-weather", 0, 0, 2, 2, "@ethio/core/weather"),
          cell("n-sensors", 2, 0, 2, 1, "@ethio/core/climate-sensors"),
          cell("n-fan", 2, 1, 2, 1, "@ethio/core/fan"),
        ],
      ),
    ],
  };
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

  return withLayouts(widgets, "overview", "Home");
}
