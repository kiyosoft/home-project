import type { MobileDashboard, MobileWidget } from "@ethio/mobile-schema";
import { otherTileSize } from "@ethio/mobile-schema";

import {
  FAVORITES_SECTION_ID,
  type ResolvedSection,
} from "@/dashboard/resolve-sections";
import { readString } from "@/widgets/types";

function entityIdOf(widget: MobileWidget | undefined): string {
  return widget ? readString(widget.config, "entity_id") : "";
}

/**
 * An area or domain section is a query, so it has no widget list to splice.
 * The first edit freezes the tiles it currently resolves to into an explicit
 * list — including the title it was showing, which the query used to derive.
 */
function withWidgets(
  document: MobileDashboard,
  section: ResolvedSection,
  widgets: MobileWidget[],
): MobileDashboard {
  return {
    ...document,
    sections: document.sections.map((entry) =>
      entry.id === section.id
        ? {
            ...entry,
            title: entry.title ?? section.title,
            source: { kind: "explicit", widgets },
          }
        : entry,
    ),
  };
}

export function addWidgetToSection(
  document: MobileDashboard,
  section: ResolvedSection,
  widget: MobileWidget,
): MobileDashboard {
  if (section.id === FAVORITES_SECTION_ID) {
    const entityId = entityIdOf(widget);
    const favorites = document.favorites ?? [];
    if (!entityId || favorites.includes(entityId)) return document;
    return { ...document, favorites: [...favorites, entityId] };
  }

  if (section.widgets.some((entry) => entry.id === widget.id)) return document;
  return withWidgets(document, section, [...section.widgets, widget]);
}

export function removeWidgetFromSection(
  document: MobileDashboard,
  section: ResolvedSection,
  widgetId: string,
): MobileDashboard {
  if (section.id === FAVORITES_SECTION_ID) {
    const entityId = entityIdOf(
      section.widgets.find((entry) => entry.id === widgetId),
    );
    if (!entityId) return document;
    return {
      ...document,
      favorites: (document.favorites ?? []).filter((id) => id !== entityId),
    };
  }

  const widgets = section.widgets.filter((entry) => entry.id !== widgetId);
  if (widgets.length === section.widgets.length) return document;
  return withWidgets(document, section, widgets);
}

/**
 * Flips a tile between half and full width. The width is written to the
 * document rather than to the widget, so a tile that a section generates —
 * from an area query or from favourites — can be resized like any other.
 */
export function toggleWidgetSize(
  document: MobileDashboard,
  section: ResolvedSection,
  widgetId: string,
): MobileDashboard {
  const widget = section.widgets.find((entry) => entry.id === widgetId);
  if (!widget) return document;
  return {
    ...document,
    sizes: {
      ...document.sizes,
      [widgetId]: otherTileSize(widget.size ?? "sm"),
    },
  };
}

/** Entity ids already placed somewhere on the dashboard. */
export function usedEntityIds(sections: ResolvedSection[]): Set<string> {
  const used = new Set<string>();
  for (const section of sections) {
    for (const widget of section.widgets) {
      const entityId = entityIdOf(widget);
      if (entityId) used.add(entityId);
    }
  }
  return used;
}
