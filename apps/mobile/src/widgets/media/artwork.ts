import { entityImageUrl, withAuthToken } from "@ethio/ha-sdk";

import { savedConnection, useHaStore } from "@/store/ha-store";

/**
 * Album art is either a path on the hub or a link to whatever service is
 * streaming. Only the hub's own paths get the access token appended: artwork
 * usually lives on a third-party CDN, which has no business seeing it.
 */
export function useArtworkUrl(picture: string | undefined): string | null {
  const baseUrl = useHaStore((state) => state.baseUrl);
  const url = entityImageUrl(picture, baseUrl);
  if (!url) return null;
  if (!baseUrl || !url.startsWith(baseUrl)) return url;
  return withAuthToken(url, savedConnection()?.token);
}
