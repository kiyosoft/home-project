export const MEDIA_PLAYER_FEATURE = {
  SEEK: 2,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  BROWSE_MEDIA: 131072,
} as const;

export interface MediaChoice {
  id: string;
  label: string;
  type: string;
  source: string;
  image: string | null;
}

export function getFriendlyName(entity: {
  entity_id: string;
  attributes: Record<string, unknown>;
}): string {
  const name = entity.attributes.friendly_name;
  if (typeof name === "string" && name.trim()) return name;
  return entity.entity_id;
}

export function strAttr(
  attrs: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function numAttr(
  attrs: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = attrs[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function supportsFeature(
  supportedFeatures: number,
  bit: number,
): boolean {
  return (supportedFeatures & bit) !== 0;
}

export function getPowerAction(
  state: string,
  supportedFeatures: number,
): "turn_on" | "turn_off" | null {
  const normalized = state.toLowerCase();
  if (!normalized || normalized === "unavailable" || normalized === "unknown") {
    return null;
  }
  const canOn = supportsFeature(supportedFeatures, MEDIA_PLAYER_FEATURE.TURN_ON);
  const canOff = supportsFeature(
    supportedFeatures,
    MEDIA_PLAYER_FEATURE.TURN_OFF,
  );
  if (normalized === "off") return canOn ? "turn_on" : null;
  return canOff ? "turn_off" : null;
}

export function isMediaActive(state: string, hasMedia: boolean): boolean {
  const normalized = state.toLowerCase();
  if (
    normalized === "playing" ||
    normalized === "paused" ||
    normalized === "buffering" ||
    normalized === "on"
  ) {
    return true;
  }
  // Idle only counts as active when something is loaded on the player.
  return normalized === "idle" && hasMedia;
}

export function isMusicAssistantPlayer(
  entityId: string,
  attrs: Record<string, unknown>,
): boolean {
  const haystack = [
    entityId,
    strAttr(attrs, "app_name"),
    strAttr(attrs, "source"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    haystack.includes("music_assistant") ||
    haystack.includes("mass") ||
    haystack.includes("music assistant")
  );
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function flattenPlayable(
  nodes: unknown[],
  fallbackType: string,
  sourceHint = "",
): MediaChoice[] {
  const queue = [...nodes];
  const result: MediaChoice[] = [];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    const node = current as Record<string, unknown>;
    const id =
      typeof node.media_content_id === "string"
        ? node.media_content_id
        : typeof node.id === "string"
          ? node.id
          : null;
    const canPlay = node.can_play !== false;
    const title =
      (typeof node.title === "string" && node.title) ||
      (typeof node.name === "string" && node.name) ||
      id;
    const type =
      (typeof node.media_content_type === "string" &&
        node.media_content_type) ||
      (typeof node.media_class === "string" && node.media_class) ||
      fallbackType;
    const source =
      (typeof node.provider === "string" && node.provider) ||
      (typeof node.app_name === "string" && node.app_name) ||
      sourceHint;
    const image =
      (typeof node.thumbnail === "string" && node.thumbnail) ||
      (typeof node.image === "string" && node.image) ||
      null;

    if (id && canPlay && title) {
      const key = `${type}::${id}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          id,
          label: String(title),
          type: String(type),
          source: String(source || ""),
          image,
        });
      }
    }

    if (Array.isArray(node.children)) {
      queue.push(...node.children);
    }
  }

  return result;
}

export function branchCanPlayRoot(root: {
  can_play?: boolean;
  media_content_id?: string;
}): boolean {
  return Boolean(root.can_play && root.media_content_id);
}
