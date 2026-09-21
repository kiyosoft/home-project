export const HOME_WIDGET_NAME = "HomeGlance";
export const ACTIVITY_WIDGET_NAME = "ActivityGlance";

export const HOME_WIDGET_URL = "ethiohome://home";
export const ACTIVITY_WIDGET_URL = "ethiohome://activity";

export const MAX_SCENES = 6;
export const MAX_FAVORITES = 4;
export const MAX_TODOS = 4;

const TOGGLE_DOMAINS = ["light", "switch", "input_boolean", "fan"] as const;

export type ToggleDomain = (typeof TOGGLE_DOMAINS)[number];

export type SceneKind = "scene" | "script";

export type GlanceSymbol =
  | "sparkles"
  | "play.fill"
  | "lightbulb"
  | "lightbulb.fill"
  | "fan"
  | "fan.fill"
  | "flag"
  | "flag.fill"
  | "switch.2";

export interface SceneChip {
  action: "scene";
  entityId: string;
  name: string;
  shortName: string;
  kind: SceneKind;
  running: boolean;
  sfSymbol: GlanceSymbol;
}

export interface FavoriteChip {
  action: "toggle";
  entityId: string;
  name: string;
  shortName: string;
  domain: ToggleDomain;
  isOn: boolean;
  sfSymbol: GlanceSymbol;
}

export interface TodoChip {
  entityId: string;
  uid: string;
  summary: string;
  listName: string;
  due?: string;
}

export type AccessoryChip = SceneChip | FavoriteChip;

export type OnByDomain = Record<ToggleDomain, number>;

export const EMPTY_ON_BY_DOMAIN: OnByDomain = {
  light: 0,
  switch: 0,
  input_boolean: 0,
  fan: 0,
};

/** Which house-wide on-count the widget headline follows. */
export const DEFAULT_HERO_METRIC: ToggleDomain = "light";

/** Translated templates the widget uses to rebuild copy after a tap. */
export interface GlanceCopy {
  temperature: string;
  heroOff: string;
  heroOne: string;
  heroMany: string;
  summaryOff: string;
  summaryOne: string;
  summaryMany: string;
  suffix: string;
}

export const EMPTY_GLANCE_COPY: GlanceCopy = {
  temperature: "",
  heroOff: "",
  heroOne: "",
  heroMany: "",
  summaryOff: "",
  summaryOne: "",
  summaryMany: "",
  suffix: "",
};

export interface HomeGlanceProps {
  connected: boolean;
  summaryLine: string;
  heroValue: string;
  heroCaption: string;
  unread: number;
  unreadLine: string;
  scenes: SceneChip[];
  favorites: FavoriteChip[];
  todos: TodoChip[];
  activatedSceneId: string;
  activatedLabel: string;
  openMessage: string;
  onByDomain: OnByDomain;
  heroMetric: ToggleDomain;
  copy: GlanceCopy;
  /**
   * Tap token so the companion can keep the optimistic glance until Home
   * Assistant state catches up. Must not be dispatched — the extension already
   * POSTed the webhook.
   */
  pendingTarget: string;
}

export interface ActivityGlanceProps {
  connected: boolean;
  unread: number;
  unreadLabel: string;
  latestTitle: string;
  headline: string;
  openMessage: string;
}

export type WidgetAction =
  | { kind: "scene"; entityId: string }
  | { kind: "toggle"; entityId: string }
  | { kind: "todo"; entityId: string; uid: string };

export const EMPTY_HOME_PROPS: HomeGlanceProps = {
  connected: false,
  summaryLine: "",
  heroValue: "",
  heroCaption: "",
  unread: 0,
  unreadLine: "",
  scenes: [],
  favorites: [],
  todos: [],
  activatedSceneId: "",
  activatedLabel: "",
  openMessage: "",
  onByDomain: EMPTY_ON_BY_DOMAIN,
  heroMetric: DEFAULT_HERO_METRIC,
  copy: EMPTY_GLANCE_COPY,
  pendingTarget: "",
};

export const EMPTY_ACTIVITY_PROPS: ActivityGlanceProps = {
  connected: false,
  unread: 0,
  unreadLabel: "",
  latestTitle: "",
  headline: "",
  openMessage: "",
};

export function isToggleDomain(domain: string): domain is ToggleDomain {
  for (const entry of TOGGLE_DOMAINS) {
    if (entry === domain) return true;
  }
  return false;
}

export function sceneTarget(entityId: string): string {
  return `scene:${entityId}`;
}

export function toggleTarget(entityId: string): string {
  return `toggle:${entityId}`;
}

export function todoTarget(entityId: string, uid: string): string {
  return `todo:${entityId}:${uid}`;
}

export function parseWidgetAction(target: unknown): WidgetAction | null {
  if (typeof target !== "string" || !target) return null;
  if (target.startsWith("scene:")) {
    const entityId = target.slice("scene:".length);
    return entityId ? { kind: "scene", entityId } : null;
  }
  if (target.startsWith("toggle:")) {
    const entityId = target.slice("toggle:".length);
    return entityId ? { kind: "toggle", entityId } : null;
  }
  if (target.startsWith("todo:")) {
    const rest = target.slice("todo:".length);
    const sep = rest.indexOf(":");
    if (sep <= 0) return null;
    const entityId = rest.slice(0, sep);
    const uid = rest.slice(sep + 1);
    return entityId && uid ? { kind: "todo", entityId, uid } : null;
  }
  return null;
}

/**
 * The companion maps a widget button `target` onto a Home Assistant service.
 * Kept free of the store so a tap can be asserted without a live hub.
 *
 * Toggles use `toggle` rather than guessing turn_on/turn_off from cached
 * state: after the user leaves the app that cache is often empty or stale,
 * and turn_on against a light that is already on is a no-op.
 */
export function serviceCallForTarget(
  target: unknown,
  _states: Record<string, { state?: string } | undefined>,
): {
  domain: string;
  service: string;
  entityId: string;
  serviceData?: Record<string, unknown>;
} | null {
  const action = parseWidgetAction(target);
  if (!action) return null;

  const domain = domainOf(action.entityId);
  if (action.kind === "scene") {
    if (domain !== "scene" && domain !== "script") return null;
    return { domain, service: "turn_on", entityId: action.entityId };
  }

  if (action.kind === "todo") {
    if (domain !== "todo") return null;
    return {
      domain: "todo",
      service: "update_item",
      entityId: action.entityId,
      serviceData: {
        entity_id: action.entityId,
        item: action.uid,
        status: "completed",
      },
    };
  }

  if (!isToggleDomain(domain)) return null;
  return {
    domain,
    service: "toggle",
    entityId: action.entityId,
  };
}

function domainOf(entityId: string): string {
  const index = entityId.indexOf(".");
  return index > 0 ? entityId.slice(0, index) : "";
}

/**
 * A widget tap arrives as `event.target` (`toggle:light.kitchen`). Older Expo
 * builds nested that under `nativeEvent`.
 */
export function targetFromWidgetEvent(event: unknown): string {
  if (!event || typeof event !== "object") return "";
  const record = event as Record<string, unknown>;
  if (typeof record.target === "string") return record.target;
  const nested = record.nativeEvent;
  if (nested && typeof nested === "object") {
    const inner = (nested as { target?: unknown }).target;
    if (typeof inner === "string") return inner;
  }
  return "";
}

/**
 * Pull a widget tap out of timeline props and clear it so the next snapshot
 * push cannot fire the same service twice.
 */
export function takePendingTarget<T extends { pendingTarget?: unknown }>(
  props: T | null | undefined,
): { target: string; rest: T & { pendingTarget: string } } | null {
  if (!props) return null;
  const target =
    typeof props.pendingTarget === "string" ? props.pendingTarget : "";
  if (!target) return null;
  return { target, rest: { ...props, pendingTarget: "" } };
}

export const PENDING_DEDUP_MS = 2000;

export type DispatchedTarget = { target: string; at: number };

export function alreadyDispatched(
  last: DispatchedTarget | null,
  target: string,
  now: number,
): boolean {
  if (!last || last.target !== target) return false;
  return now - last.at < PENDING_DEDUP_MS;
}

export function favoriteSymbol(
  domain: ToggleDomain,
  isOn: boolean,
): GlanceSymbol {
  switch (domain) {
    case "light":
      return isOn ? "lightbulb.fill" : "lightbulb";
    case "fan":
      return isOn ? "fan.fill" : "fan";
    case "input_boolean":
      return isOn ? "flag.fill" : "flag";
    case "switch":
      return "switch.2";
  }
}

/** Filled glyphs for circular accessory tiles, on or off. */
export function accessorySymbol(domain: ToggleDomain): GlanceSymbol {
  switch (domain) {
    case "light":
      return "lightbulb.fill";
    case "fan":
      return "fan.fill";
    case "input_boolean":
      return "flag.fill";
    case "switch":
      return "switch.2";
  }
}

export function sceneSymbol(kind: SceneKind): GlanceSymbol {
  return kind === "script" ? "play.fill" : "sparkles";
}

export function activateScene(
  props: HomeGlanceProps,
  entityId: string,
): HomeGlanceProps {
  return {
    ...props,
    activatedSceneId: entityId,
    scenes: props.scenes.map((scene) =>
      scene.entityId === entityId ? { ...scene, running: true } : scene,
    ),
  };
}

export function toggleFavorite(
  props: HomeGlanceProps,
  entityId: string,
): HomeGlanceProps {
  return {
    ...props,
    favorites: props.favorites.map((item) => {
      if (item.entityId !== entityId) return item;
      return { ...item, isOn: !item.isOn };
    }),
  };
}

export function pickHomeControls(
  family: string,
  props: HomeGlanceProps,
): {
  scenes: SceneChip[];
  favorites: FavoriteChip[];
  showUnread: boolean;
} {
  if (family === "systemSmall") {
    if (props.scenes.length > 0) {
      return {
        scenes: props.scenes.slice(0, 2),
        favorites: [],
        showUnread: false,
      };
    }
    return {
      scenes: [],
      favorites: props.favorites.slice(0, 2),
      showUnread: false,
    };
  }

  if (family === "systemLarge") {
    return {
      scenes: props.scenes.slice(0, 6),
      favorites: props.favorites.slice(0, 4),
      showUnread: props.unread > 0,
    };
  }

  return {
    scenes: props.scenes.slice(0, 4),
    favorites: props.favorites.slice(0, 2),
    showUnread: false,
  };
}

export function rowsOf<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
}
