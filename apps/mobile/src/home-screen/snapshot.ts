import type { HassEntities } from "@ethio/ha-sdk";
import {
  isSceneEntityId,
  type MobileDashboard,
} from "@ethio/mobile-schema";

import {
  formatHomeSummary,
  summarizeHome,
} from "@/dashboard/home-summary";
import type { MessageKey, TranslateParams } from "@/i18n";
import type { NotificationRecord } from "@/store/notification-store";
import { unreadCount } from "@/store/notification-store";
import { entityDomain, entityName, isUnavailable } from "@/store/use-entity";

import {
  EMPTY_HOME_PROPS,
  MAX_FAVORITES,
  MAX_SCENES,
  accessorySymbol,
  isToggleDomain,
  sceneSymbol,
  type ActivityGlanceProps,
  type FavoriteChip,
  type HomeGlanceProps,
  type SceneChip,
  type SceneKind,
} from "./types";

type Translate = (key: MessageKey, params?: TranslateParams) => string;

function sceneKind(entityId: string): SceneKind {
  return entityDomain(entityId) === "script" ? "script" : "scene";
}

function clipName(name: string): string {
  const trimmed = name.trim();
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first.length > 12 ? first.slice(0, 12) : first;
}

function collectScenes(
  document: MobileDashboard,
  entities: HassEntities,
): SceneChip[] {
  const scenes: SceneChip[] = [];
  const seen = new Set<string>();

  for (const section of document.sections) {
    if (section.source.kind !== "scene") continue;
    for (const entityId of section.source.entities) {
      if (seen.has(entityId) || !isSceneEntityId(entityId)) continue;
      const entity = entities[entityId];
      if (!entity) continue;
      seen.add(entityId);
      const kind = sceneKind(entityId);
      const name = entityName(entity, entityId);
      scenes.push({
        action: "scene",
        entityId,
        name,
        shortName: clipName(name),
        kind,
        running: entity.state === "on",
        sfSymbol: sceneSymbol(kind),
      });
      if (scenes.length >= MAX_SCENES) return scenes;
    }
  }

  return scenes;
}

function pushToggleChip(
  chips: FavoriteChip[],
  entityId: string,
  entities: HassEntities,
): boolean {
  if (chips.length >= MAX_FAVORITES) return false;
  if (chips.some((chip) => chip.entityId === entityId)) return false;
  const domain = entityDomain(entityId);
  if (!isToggleDomain(domain)) return false;
  const entity = entities[entityId];
  if (isUnavailable(entity)) return false;
  const name = entityName(entity, entityId);
  chips.push({
    action: "toggle",
    entityId,
    name,
    shortName: clipName(name),
    domain,
    isOn: entity.state === "on",
    sfSymbol: accessorySymbol(domain),
  });
  return true;
}

function collectFavorites(
  document: MobileDashboard,
  entities: HassEntities,
): FavoriteChip[] {
  const favorites: FavoriteChip[] = [];

  for (const entityId of document.favorites ?? []) {
    pushToggleChip(favorites, entityId, entities);
    if (favorites.length >= MAX_FAVORITES) return favorites;
  }

  if (favorites.length > 0) return favorites;

  // Nothing pinned yet: use lights and switches already on the dashboard so
  // the Home Screen widget is not empty before anyone finds Favourites.
  for (const section of document.sections) {
    if (section.source.kind !== "explicit") continue;
    for (const widget of section.source.widgets) {
      const entityId = widget.config.entity_id;
      if (typeof entityId !== "string") continue;
      pushToggleChip(favorites, entityId, entities);
      if (favorites.length >= MAX_FAVORITES) return favorites;
    }
  }

  return favorites;
}

export function buildHomeSnapshot(options: {
  connected: boolean;
  entities: HassEntities;
  document: MobileDashboard;
  unread: number;
  t: Translate;
}): HomeGlanceProps {
  const { connected, entities, document, unread, t } = options;
  if (!connected) {
    return { ...EMPTY_HOME_PROPS, openMessage: t("widget.home.open") };
  }

  const summary = summarizeHome(entities);
  const lightsCaption =
    summary.lightsOn === 0
      ? t("widget.home.heroOff")
      : summary.lightsOn === 1
        ? t("widget.home.heroLight")
        : t("widget.home.heroLights");

  return {
    connected: true,
    summaryLine: formatHomeSummary(summary, t),
    heroValue:
      summary.temperature !== null
        ? `${summary.temperature}°`
        : String(summary.lightsOn),
    heroCaption:
      summary.temperature !== null
        ? summary.lightsOn === 0
          ? t("home.summaryLightsOff")
          : summary.lightsOn === 1
            ? t("home.summaryLightOne")
            : t("home.summaryLights", { count: summary.lightsOn })
        : lightsCaption,
    unread,
    unreadLine: unread > 0 ? t("activity.unread", { count: unread }) : "",
    scenes: collectScenes(document, entities),
    favorites: collectFavorites(document, entities),
    activatedSceneId: "",
    activatedLabel: t("scene.activated"),
    openMessage: t("widget.home.open"),
  };
}

export function buildActivitySnapshot(options: {
  connected: boolean;
  records: NotificationRecord[];
  t: Translate;
}): ActivityGlanceProps {
  const { connected, records, t } = options;
  const unread = unreadCount(records);
  const latest = records.find((entry) => !entry.read);

  return {
    connected,
    unread,
    unreadLabel: t("widget.activity.unreadLabel"),
    latestTitle: latest?.title?.trim() || latest?.message || "",
    headline:
      unread > 0
        ? t("activity.unread", { count: unread })
        : t("widget.activity.caughtUp"),
    openMessage: t("widget.home.open"),
  };
}

export function snapshotKey(value: object): string {
  return JSON.stringify(value);
}
