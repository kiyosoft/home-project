import type { BrowseMediaItem } from "./types";

export interface BrowseMediaOptions {
  entityId: string;
  mediaContentType?: string;
  mediaContentId?: string;
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
  if (options.mediaContentType != null) {
    message.media_content_type = options.mediaContentType;
  }
  if (options.mediaContentId != null) {
    message.media_content_id = options.mediaContentId;
  }
  return sendMessagePromise<BrowseMediaItem>(message);
}
