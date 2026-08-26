import type { BrowseMediaItem } from "./types";

export interface BrowseMediaOptions {
  entityId: string;
  mediaContentType?: string;
  mediaContentId?: string;
}

export interface HassCoreConfig {
  country?: string | null;
  language?: string;
  time_zone?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  internal_url?: string | null;
  external_url?: string | null;
}

/** Build and send a media_player/browse_media WebSocket request. */
export async function browseMedia(
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
  options: BrowseMediaOptions,
): Promise<BrowseMediaItem> {
  const message: Record<string, unknown> = {
    type: "media_player/browse_media",
    entity_id: options.entityId,
  };
  // HA requires these Inclusive fields together; JSON would otherwise drop
  // one side and the command fails validation.
  const type = options.mediaContentType;
  const id = options.mediaContentId;
  if (typeof type === "string" && type && typeof id === "string" && id) {
    message.media_content_type = type;
    message.media_content_id = id;
  }
  return sendMessagePromise<BrowseMediaItem>(message);
}

/** Browse a Home Assistant media source (Radio Browser, local media, …). */
export async function browseMediaSource(
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
  mediaContentId?: string,
): Promise<BrowseMediaItem> {
  const message: Record<string, unknown> = {
    type: "media_source/browse_media",
  };
  if (typeof mediaContentId === "string" && mediaContentId) {
    message.media_content_id = mediaContentId;
  }
  return sendMessagePromise<BrowseMediaItem>(message);
}

/** Home Assistant core config — used for Radio Browser country. */
export async function getHassConfig(
  sendMessagePromise: <T>(message: Record<string, unknown>) => Promise<T>,
): Promise<HassCoreConfig> {
  return sendMessagePromise<HassCoreConfig>({ type: "get_config" });
}
