import type { AreaRegistryEntry, HassEntities } from "@ethio/ha-sdk";
import type {
  MobileDashboard,
  MobileSection,
  MobileWidget,
} from "@ethio/mobile-schema";
import { isSceneEntityId } from "@ethio/mobile-schema";

import type { MessageKey, TranslateParams } from "@/i18n";
import { entityDomain, entityName } from "@/store/use-entity";
import { widgetForEntity } from "@/widgets/registry";

/** Favourites live on the document root, not in `sections`. */
export const FAVORITES_SECTION_ID = "favorites";

export interface ResolvedSection {
  id: string;
  title: string;
  collapsed: boolean;
  widgets: MobileWidget[];
  /** Scene and script ids. Set only on a scene section, which has no widgets. */
  scenes?: string[];
}

export interface ResolveOptions {
  document: MobileDashboard;
  entities: HassEntities;
  areas: AreaRegistryEntry[];
  areaByEntity: Record<string, string>;
  t: (key: MessageKey, params?: TranslateParams) => string;
  /** Edit mode keeps emptied sections on screen so they still take an add tile. */
  includeEmpty?: boolean;
}

const DOMAIN_LABELS: Record<string, MessageKey> = {
  light: "widget.domain.light",
  climate: "widget.domain.climate",
  cover: "widget.domain.cover",
  lock: "widget.domain.lock",
  camera: "widget.domain.camera",
  switch: "widget.domain.switch",
  input_boolean: "widget.domain.switch",
  media_player: "widget.domain.media",
  sensor: "widget.domain.sensor",
  binary_sensor: "widget.domain.sensor",
};

function domainLabel(
  domains: string[],
  t: ResolveOptions["t"],
): string {
  const raw = domains[0];
  if (!raw) return "";
  const key = DOMAIN_LABELS[raw];
  return key ? t(key) : raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function widgetForId(
  sectionId: string,
  entityId: string,
  entities: HassEntities,
): MobileWidget | null {
  const entity = entities[entityId];
  if (!entity) return null;
  const def = widgetForEntity(entity);
  if (!def) return null;
  return {
    id: `${sectionId}:${entityId}`,
    type: def.id,
    config: { entity_id: entityId },
    size: def.defaultSize,
  };
}

function sortByName(entityIds: string[], entities: HassEntities): string[] {
  return [...entityIds].sort((a, b) =>
    entityName(entities[a], a).localeCompare(entityName(entities[b], b)),
  );
}

function resolveSection(
  section: MobileSection,
  options: ResolveOptions,
  seen: Set<string>,
): ResolvedSection | null {
  const { entities, areas, areaByEntity, t } = options;
  const source = section.source;

  if (source.kind === "scene") {
    // Drop ids the hub no longer exposes rather than showing a dead button.
    const scenes = source.entities.filter(
      (entityId) => entities[entityId] && isSceneEntityId(entityId),
    );
    for (const entityId of scenes) seen.add(entityId);
    if (!scenes.length && !options.includeEmpty) return null;
    return {
      id: section.id,
      title: section.title ?? "",
      collapsed: section.collapsed ?? false,
      widgets: [],
      scenes,
    };
  }

  if (source.kind === "explicit") {
    // Hand-written widgets render as written, even if something above showed the entity.
    const widgets = source.widgets;
    for (const widget of widgets) {
      const entityId = widget.config.entity_id;
      if (typeof entityId === "string") seen.add(entityId);
    }
    if (!widgets.length && !options.includeEmpty) return null;
    return {
      id: section.id,
      title: section.title ?? "",
      collapsed: section.collapsed ?? false,
      widgets,
    };
  }

  const exclude = new Set(source.exclude ?? []);
  const candidates = Object.keys(entities).filter((entityId) => {
    if (seen.has(entityId) || exclude.has(entityId)) return false;
    if (source.kind === "area") {
      return areaByEntity[entityId] === source.areaId;
    }
    if (source.areaId && areaByEntity[entityId] !== source.areaId) return false;
    return source.domains.includes(entityDomain(entityId));
  });

  const widgets: MobileWidget[] = [];
  for (const entityId of sortByName(candidates, entities)) {
    const widget = widgetForId(section.id, entityId, entities);
    if (!widget) continue;
    seen.add(entityId);
    widgets.push(widget);
  }
  if (!widgets.length && !options.includeEmpty) return null;

  const derived =
    source.kind === "area"
      ? (areas.find((area) => area.area_id === source.areaId)?.name ??
        source.areaId)
      : domainLabel(source.domains, t);

  return {
    id: section.id,
    title: section.title ?? derived,
    collapsed: section.collapsed ?? false,
    widgets,
  };
}

/** A resize is stored on the document, so it survives a section it cannot edit. */
function applySizes(
  widgets: MobileWidget[],
  sizes: MobileDashboard["sizes"],
): MobileWidget[] {
  if (!sizes) return widgets;
  return widgets.map((widget) => {
    const size = sizes[widget.id];
    return size && size !== widget.size ? { ...widget, size } : widget;
  });
}

/**
 * Flattens a dashboard document into the sections a screen renders. Sections
 * resolve in order and a query section skips entities an earlier section
 * already claimed, so area sections take precedence over domain sweeps.
 * Scene sections are lifted to the top, whatever their index.
 */
export function resolveSections(options: ResolveOptions): ResolvedSection[] {
  const seen = new Set<string>();
  const resolved: ResolvedSection[] = [];
  const sizes = options.document.sizes;

  for (const section of options.document.sections) {
    if (section.source.kind !== "scene") continue;
    const next = resolveSection(section, options, seen);
    if (next) resolved.push(next);
  }

  const favorites = options.document.favorites ?? [];
  if (favorites.length) {
    const widgets: MobileWidget[] = [];
    for (const entityId of favorites) {
      const widget = widgetForId(FAVORITES_SECTION_ID, entityId, options.entities);
      if (!widget) continue;
      seen.add(entityId);
      widgets.push(widget);
    }
    if (widgets.length || options.includeEmpty) {
      resolved.push({
        id: FAVORITES_SECTION_ID,
        title: options.t("widget.section.favorites"),
        collapsed: false,
        widgets,
      });
    }
  }

  for (const section of options.document.sections) {
    if (section.source.kind === "scene") continue;
    const next = resolveSection(section, options, seen);
    if (next) resolved.push(next);
  }

  return resolved.map((section) => ({
    ...section,
    widgets: applySizes(section.widgets, sizes),
  }));
}
