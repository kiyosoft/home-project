import type { HassEntity } from "./types";

/** Bit flags from homeassistant.components.media_player.MediaPlayerEntityFeature */
export const MEDIA_PLAYER_FEATURE = {
  SEEK: 2,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  PLAY_MEDIA: 512,
  BROWSE_MEDIA: 131072,
} as const;

export function mediaSupportsFeature(
  supportedFeatures: number,
  bit: number,
): boolean {
  return (supportedFeatures & bit) !== 0;
}

function numAttr(
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

function strAttr(
  attrs: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function mediaIsActive(state: string, hasMedia: boolean): boolean {
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

export function mediaPowerAction(
  state: string,
  supportedFeatures: number,
): "turn_on" | "turn_off" | null {
  const normalized = state.toLowerCase();
  if (!normalized || normalized === "unavailable" || normalized === "unknown") {
    return null;
  }
  const canOn = mediaSupportsFeature(
    supportedFeatures,
    MEDIA_PLAYER_FEATURE.TURN_ON,
  );
  const canOff = mediaSupportsFeature(
    supportedFeatures,
    MEDIA_PLAYER_FEATURE.TURN_OFF,
  );
  if (normalized === "off") return canOn ? "turn_on" : null;
  return canOff ? "turn_off" : null;
}

export interface MediaView {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  isPlaying: boolean;
  isOff: boolean;
  /** Something is loaded and worth showing, so an idle speaker can still qualify. */
  isActive: boolean;
  title: string | undefined;
  /** Falls back to series and album, so a show or a record still labels the line. */
  artist: string | undefined;
  entityPicture: string | undefined;
  volumePercent: number;
  isMuted: boolean;
  /** Null when the player exposes neither turn_on nor turn_off for its state. */
  powerAction: "turn_on" | "turn_off" | null;
  supportsPrevious: boolean;
  supportsNext: boolean;
  supportsVolumeSet: boolean;
  supportsVolumeMute: boolean;
}

export function deriveMedia(entity: HassEntity | undefined): MediaView | null {
  if (!entity) return null;
  const attrs = entity.attributes;
  const features = numAttr(attrs, "supported_features") ?? 0;
  const state = entity.state.toLowerCase();
  const title = strAttr(attrs, "media_title");
  const artist =
    strAttr(attrs, "media_artist") ??
    strAttr(attrs, "media_series_title") ??
    strAttr(attrs, "media_album_name");

  return {
    entityId: entity.entity_id,
    state: entity.state,
    attributes: attrs,
    isPlaying: state === "playing",
    isOff: state === "off",
    isActive: state !== "off" && mediaIsActive(state, Boolean(title || artist)),
    title,
    artist,
    entityPicture: strAttr(attrs, "entity_picture"),
    volumePercent: Math.round((numAttr(attrs, "volume_level") ?? 0) * 100),
    isMuted: Boolean(attrs.is_volume_muted),
    powerAction: mediaPowerAction(entity.state, features),
    supportsPrevious: mediaSupportsFeature(
      features,
      MEDIA_PLAYER_FEATURE.PREVIOUS_TRACK,
    ),
    supportsNext: mediaSupportsFeature(
      features,
      MEDIA_PLAYER_FEATURE.NEXT_TRACK,
    ),
    supportsVolumeSet: mediaSupportsFeature(
      features,
      MEDIA_PLAYER_FEATURE.VOLUME_SET,
    ),
    supportsVolumeMute: mediaSupportsFeature(
      features,
      MEDIA_PLAYER_FEATURE.VOLUME_MUTE,
    ),
  };
}
