export const HOME_WIDGET_NAME = "HomeGlance";
export const ACTIVITY_WIDGET_NAME = "ActivityGlance";

export const HOME_WIDGET_URL = "ethiohome://home";
export const ACTIVITY_WIDGET_URL = "ethiohome://activity";

export const MAX_SCENES = 6;
export const MAX_FAVORITES = 4;

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

export type AccessoryChip = SceneChip | FavoriteChip;

export interface HomeGlanceProps {
  connected: boolean;
  summaryLine: string;
  heroValue: string;
  heroCaption: string;
  unread: number;
  unreadLine: string;
  scenes: SceneChip[];
  favorites: FavoriteChip[];
  activatedSceneId: string;
  activatedLabel: string;
  openMessage: string;
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
  | { kind: "toggle"; entityId: string };

export const EMPTY_HOME_PROPS: HomeGlanceProps = {
  connected: false,
  summaryLine: "",
  heroValue: "",
  heroCaption: "",
  unread: 0,
  unreadLine: "",
  scenes: [],
  favorites: [],
  activatedSceneId: "",
  activatedLabel: "",
  openMessage: "",
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
  return null;
}

/**
 * The companion maps a widget button `target` onto a Home Assistant service.
 * Kept free of the store so a tap can be asserted without a live hub.
 */
export function serviceCallForTarget(
  target: unknown,
  states: Record<string, { state?: string } | undefined>,
): { domain: string; service: string; entityId: string } | null {
  const action = parseWidgetAction(target);
  if (!action) return null;

  const domain = domainOf(action.entityId);
  if (action.kind === "scene") {
    if (domain !== "scene" && domain !== "script") return null;
    return { domain, service: "turn_on", entityId: action.entityId };
  }

  if (!isToggleDomain(domain)) return null;
  const isOn = states[action.entityId]?.state === "on";
  return {
    domain,
    service: isOn ? "turn_off" : "turn_on",
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
