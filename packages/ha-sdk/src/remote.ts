import type { HassEntity } from "./types";

export type RemoteCommand =
  | "up"
  | "down"
  | "left"
  | "right"
  | "ok"
  | "back"
  | "home"
  | "volumeUp"
  | "volumeDown"
  | "power"
  | "powerOff";

export interface RemotePress {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

type KeyMap = Record<RemoteCommand, string>;

const ANDROID_REMOTE_KEYS: KeyMap = {
  up: "DPAD_UP",
  down: "DPAD_DOWN",
  left: "DPAD_LEFT",
  right: "DPAD_RIGHT",
  ok: "DPAD_CENTER",
  back: "BACK",
  home: "HOME",
  volumeUp: "VOLUME_UP",
  volumeDown: "VOLUME_DOWN",
  power: "POWER",
  powerOff: "POWER",
};

const ANDROID_ADB_KEYS: KeyMap = {
  up: "UP",
  down: "DOWN",
  left: "LEFT",
  right: "RIGHT",
  ok: "ENTER",
  back: "BACK",
  home: "HOME",
  volumeUp: "VOLUME_UP",
  volumeDown: "VOLUME_DOWN",
  power: "POWER",
  powerOff: "POWER",
};

const SAMSUNG_KEYS: KeyMap = {
  up: "KEY_UP",
  down: "KEY_DOWN",
  left: "KEY_LEFT",
  right: "KEY_RIGHT",
  ok: "KEY_ENTER",
  back: "KEY_RETURN",
  home: "KEY_HOME",
  volumeUp: "KEY_VOLUP",
  volumeDown: "KEY_VOLDOWN",
  power: "KEY_POWER",
  powerOff: "KEY_POWEROFF",
};

const WEBOSTV_KEYS: KeyMap = {
  up: "UP",
  down: "DOWN",
  left: "LEFT",
  right: "RIGHT",
  ok: "ENTER",
  back: "BACK",
  home: "HOME",
  volumeUp: "VOLUMEUP",
  volumeDown: "VOLUMEDOWN",
  power: "POWER",
  powerOff: "POWER",
};

const APPLE_TV_KEYS: KeyMap = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  ok: "select",
  back: "menu",
  home: "home",
  volumeUp: "volume_up",
  volumeDown: "volume_down",
  power: "wakeup",
  powerOff: "suspend",
};

/** Integration id from the entity registry, including common aliases. */
const PLATFORM_KEYS: Record<string, KeyMap> = {
  androidtv_remote: ANDROID_REMOTE_KEYS,
  androidtv: ANDROID_ADB_KEYS,
  samsungtv: SAMSUNG_KEYS,
  samsungtv_smart: SAMSUNG_KEYS,
  webostv: WEBOSTV_KEYS,
  apple_tv: APPLE_TV_KEYS,
};

/**
 * Show the handheld remote for a TV. A remote entity, a media player with
 * device class `tv`, or a player that has a same-id remote (`remote.tv`).
 */
export function showsTvRemote(
  entity: HassEntity | undefined,
  entities: Record<string, HassEntity | undefined> = {},
): boolean {
  if (!entity) return false;
  if (entity.entity_id.startsWith("remote.")) return true;
  if (entity.attributes.device_class === "tv") return true;
  const id = entity.entity_id.slice(entity.entity_id.indexOf(".") + 1);
  return Boolean(entities[`remote.${id}`]);
}

function slug(entityId: string): string {
  return entityId.slice(entityId.indexOf(".") + 1);
}

function asRemote(entityId: string): string {
  return entityId.startsWith("remote.") ? entityId : `remote.${slug(entityId)}`;
}

function asPlayer(entityId: string): string {
  return entityId.startsWith("media_player.")
    ? entityId
    : `media_player.${slug(entityId)}`;
}

/**
 * One logical button, translated into the service that integration expects.
 * webOS has no remote entity: the button service targets the media player.
 * The others take `remote.send_command` on the remote entity.
 */
export function remotePress(
  platform: string | undefined,
  command: RemoteCommand,
  entityId: string,
): RemotePress | null {
  const keys = platform ? PLATFORM_KEYS[platform] : undefined;
  if (!keys) return null;
  if (platform === "webostv") {
    const player = asPlayer(entityId);
    if (command === "power" || command === "powerOff") {
      return {
        domain: "media_player",
        service: command === "powerOff" ? "turn_off" : "turn_on",
        data: { entity_id: player },
      };
    }
    return {
      domain: "webostv",
      service: "button",
      data: { entity_id: player, button: keys[command] },
    };
  }
  return {
    domain: "remote",
    service: "send_command",
    data: { entity_id: asRemote(entityId), command: [keys[command]] },
  };
}

export async function fetchEntityPlatform(
  send: (message: Record<string, unknown>) => Promise<unknown>,
  entityId: string,
): Promise<string | undefined> {
  if (!entityId) return undefined;
  try {
    const entry = await send({
      type: "config/entity_registry/get",
      entity_id: entityId,
    });
    if (!entry || typeof entry !== "object") return undefined;
    const platform = (entry as Record<string, unknown>).platform;
    return typeof platform === "string" && platform ? platform : undefined;
  } catch {
    return undefined;
  }
}

function strAttr(
  attrs: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function stringList(attrs: Record<string, unknown>, key: string): string[] {
  const value = attrs[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

export interface RemoteView {
  entityId: string;
  isOn: boolean;
  activity: string | undefined;
  activities: string[];
}

export function deriveRemote(entity: HassEntity | undefined): RemoteView | null {
  if (!entity) return null;
  const attrs = entity.attributes;
  const state = entity.state.toLowerCase();
  const activity = strAttr(attrs, "current_activity");
  return {
    entityId: entity.entity_id,
    // A foreground app means the panel is on, even when the remote entity
    // itself stays "off". Android TV Remote often does that.
    isOn: state === "on" || state === "idle" || Boolean(activity),
    activity,
    activities: stringList(attrs, "activity_list"),
  };
}

const PLAYER_AWAKE = new Set([
  "on",
  "playing",
  "paused",
  "idle",
  "buffering",
]);

/**
 * The remote entity and the TV's media player share an object id
 * (`remote.tv` / `media_player.tv`). The player is awake when the remote
 * state is not.
 * ponytail: same object id only. A device-registry join if the ids diverge.
 */
export function remoteSeesTv(
  remote: HassEntity,
  entities: Record<string, HassEntity | undefined>,
): boolean {
  if (deriveRemote(remote)?.isOn) return true;
  const slug = remote.entity_id.slice(remote.entity_id.indexOf(".") + 1);
  const player = entities[`media_player.${slug}`];
  return Boolean(player && PLAYER_AWAKE.has(player.state.toLowerCase()));
}
