import { useEffect, useState } from "react";

import { useBrowseMedia } from "@ethio/plugin-sdk";

import {
  branchCanPlayRoot,
  flattenPlayable,
  type MediaChoice,
} from "./media-utils";

export function useMediaBrowse(
  entityId: string,
  canBrowse: boolean,
  showBrowse: boolean,
) {
  const browseMedia = useBrowseMedia();
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState("");
  const [playlists, setPlaylists] = useState<MediaChoice[]>([]);
  const [library, setLibrary] = useState<MediaChoice[]>([]);

  useEffect(() => {
    if (!showBrowse || !canBrowse) return;

    let cancelled = false;
    setBrowseLoading(true);
    setBrowseError("");

    void browseMedia({ entityId })
      .then(async (root) => {
        if (cancelled) return;

        const children = Array.isArray(root.children) ? root.children : [];
        const expanded = await Promise.all(
          children.map(async (branch) => {
            const branchTitle = String(branch.title || "").toLowerCase();
            const branchType = String(
              branch.media_content_type || branch.media_class || "",
            ).toLowerCase();
            const isPlaylistBranch =
              branchTitle.includes("playlist") ||
              branchType.includes("playlist");

            let nodes = Array.isArray(branch.children) ? branch.children : [];
            if (branch.can_expand && nodes.length === 0) {
              const detail = await browseMedia({
                entityId,
                mediaContentType: branch.media_content_type,
                mediaContentId: branch.media_content_id,
              });
              nodes = Array.isArray(detail.children) ? detail.children : [];
            }

            return { branch, nodes, isPlaylistBranch };
          }),
        );

        if (cancelled) return;

        const nextPlaylists: MediaChoice[] = [];
        const nextLibrary: MediaChoice[] = [];

        for (const { branch, nodes, isPlaylistBranch } of expanded) {
          const items = flattenPlayable(
            nodes,
            isPlaylistBranch ? "playlist" : "music",
            branch.title || "",
          );
          if (isPlaylistBranch) nextPlaylists.push(...items);
          else nextLibrary.push(...items);
        }

        if (branchCanPlayRoot(root)) {
          nextLibrary.push(
            ...flattenPlayable([root], "music", root.title || ""),
          );
        }

        setPlaylists(nextPlaylists);
        setLibrary(nextLibrary);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setBrowseError(
          error instanceof Error ? error.message : "Browse failed",
        );
      })
      .finally(() => {
        if (!cancelled) setBrowseLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showBrowse, canBrowse, entityId, browseMedia]);

  return { browseLoading, browseError, playlists, library };
}
