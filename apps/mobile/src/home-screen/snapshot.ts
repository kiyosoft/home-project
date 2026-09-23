import { listTodoItems, type HassEntities } from "@ethio/ha-sdk";
import {
  isSceneEntityId,
  type MobileDashboard,
} from "@ethio/mobile-schema";

import {
  formatHomeSummarySuffix,
  summarizeHome,
} from "@/dashboard/home-summary";
import type { MessageKey, TranslateParams } from "@/i18n";
import type { NotificationRecord } from "@/store/notification-store";
import { unreadCount } from "@/store/notification-store";
import { entityDomain, entityName, isUnavailable } from "@/store/use-entity";

import { collectUpcomingTodos, glanceCopyPack, paintGlance } from "./glance";
import {
  DEFAULT_HERO_METRIC,
  EMPTY_HOME_PROPS,
  EMPTY_ON_BY_DOMAIN,
  MAX_FAVORITES,
  MAX_SCENES,
  accessorySymbol,
  isLockLocked,
  isToggleDomain,
  lockActionForState,
  lockSymbol,
  sceneSymbol,
  type ActivityGlanceProps,
  type FavoriteChip,
  type HomeGlanceProps,
  type OnByDomain,
  type SceneChip,
  type SceneKind,
  type TodoChip,
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

function pushLockChip(
  chips: FavoriteChip[],
  entityId: string,
  entities: HassEntities,
): boolean {
  if (chips.length >= MAX_FAVORITES) return false;
  if (chips.some((chip) => chip.entityId === entityId)) return false;
  if (entityDomain(entityId) !== "lock") return false;
  const entity = entities[entityId];
  if (isUnavailable(entity)) return false;
  const locked = isLockLocked(entity.state);
  const name = entityName(entity, entityId);
  chips.push({
    action: lockActionForState(entity.state),
    entityId,
    name,
    shortName: clipName(name),
    domain: "lock",
    isOn: locked,
    sfSymbol: lockSymbol(locked),
  });
  return true;
}

function pushFavoriteChip(
  chips: FavoriteChip[],
  entityId: string,
  entities: HassEntities,
): boolean {
  return (
    pushToggleChip(chips, entityId, entities) ||
    pushLockChip(chips, entityId, entities)
  );
}

function collectFavorites(
  document: MobileDashboard,
  entities: HassEntities,
): FavoriteChip[] {
  const favorites: FavoriteChip[] = [];

  for (const entityId of document.favorites ?? []) {
    pushFavoriteChip(favorites, entityId, entities);
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
      pushFavoriteChip(favorites, entityId, entities);
      if (favorites.length >= MAX_FAVORITES) return favorites;
    }
  }

  return favorites;
}

function collectOnByDomain(
  entities: HassEntities,
  lightsOn: number,
): OnByDomain {
  const counts: OnByDomain = { ...EMPTY_ON_BY_DOMAIN, light: lightsOn };
  for (const entityId of Object.keys(entities)) {
    const domain = entityDomain(entityId);
    if (domain === "light" || !isToggleDomain(domain)) continue;
    const entity = entities[entityId];
    if (isUnavailable(entity) || entity.state !== "on") continue;
    counts[domain] += 1;
  }
  return counts;
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
  const temperatureLabel =
    summary.temperature !== null ? `${summary.temperature}°` : "";
  return paintGlance({
    connected: true,
    summaryLine: "",
    heroValue: "",
    heroCaption: "",
    unread,
    unreadLine: unread > 0 ? t("activity.unread", { count: unread }) : "",
    scenes: collectScenes(document, entities),
    favorites: collectFavorites(document, entities),
    todos: [],
    activatedSceneId: "",
    activatedLabel: t("scene.activated"),
    openMessage: t("widget.home.open"),
    onByDomain: collectOnByDomain(entities, summary.lightsOn),
    heroMetric: DEFAULT_HERO_METRIC,
    copy: glanceCopyPack({
      temperatureLabel,
      suffix: formatHomeSummarySuffix(summary, t),
      heroOff: t("widget.home.heroOff"),
      heroOne: t("widget.home.heroLight"),
      heroMany: t("widget.home.heroLights"),
      summaryOff: t("home.summaryLightsOff"),
      summaryOne: t("home.summaryLightOne"),
      summaryMany: t("home.summaryLights"),
    }),
    pendingTarget: "",
  });
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

export async function loadUpcomingTodos(
  entities: HassEntities,
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
): Promise<TodoChip[]> {
  const ids = Object.keys(entities)
    .filter(
      (entityId) =>
        entityDomain(entityId) === "todo" && !isUnavailable(entities[entityId]),
    )
    .sort();
  const lists = await Promise.all(
    ids.map(async (entityId) => {
      const listName = entityName(entities[entityId], entityId);
      try {
        const items = await listTodoItems(sendMessagePromise, entityId);
        return { entityId, listName, items };
      } catch {
        return { entityId, listName, items: [] };
      }
    }),
  );
  return collectUpcomingTodos(lists);
}
