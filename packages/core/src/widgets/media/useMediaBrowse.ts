import { useEffect, useState } from "react";

import {
  useBrowseMedia,
  useBrowseMediaSource,
  useHassConfig,
} from "@ethio/plugin-sdk";

import {
  branchCanPlayRoot,
  flattenPlayable,
  type MediaChoice,
} from "./media-utils";
import {
  loadRadioBrowserStations,
  preferredCountryCode,
} from "./radio-browse";

interface BrowseNode {
  title?: string;
  media_class?: string;
  media_content_type?: string;
  media_content_id?: string;
  can_play?: boolean;
  can_expand?: boolean;
  children?: BrowseNode[] | null;
}

const MASS_LIBRARY_FOLDERS = [
  "playlists",
  "albums",
  "tracks",
  "radio",
  "podcasts",
  "audiobooks",
] as const;

function browseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Browse failed";
}

function asNode(value: unknown): BrowseNode | null {
  if (!value || typeof value !== "object") return null;
  return value as BrowseNode;
}

function childrenOf(node: BrowseNode | null | undefined): BrowseNode[] {
  if (!Array.isArray(node?.children)) return [];
  return node.children.filter((child): child is BrowseNode =>
    Boolean(child && typeof child === "object"),
  );
}

function canExpandBranch(branch: BrowseNode): boolean {
  const type = branch.media_content_type;
  const id = branch.media_content_id;
  if (typeof type !== "string" || !type || typeof id !== "string" || !id) {
    return false;
  }
  // MASS root also injects every media_source folder; those often error and
  // are not the Music Assistant library this panel is meant to show.
  if (id.startsWith("media-source://")) return false;
  const key = id.toLowerCase();
  const title = String(branch.title || "").toLowerCase();
  // Artists need another hop and can be huge; skip so one timeout cannot stall
  // playlists and albums.
  return key !== "artists" && title !== "artists";
}

function isPlaylistBranch(branch: BrowseNode): boolean {
  const title = String(branch.title || "").toLowerCase();
  const type = String(
    branch.media_content_type || branch.media_class || "",
  ).toLowerCase();
  return title.includes("playlist") || type.includes("playlist");
}

function isRadioBranch(branch: BrowseNode): boolean {
  const title = String(branch.title || "").toLowerCase();
  const type = String(
    branch.media_content_type || branch.media_class || "",
  ).toLowerCase();
  const id = String(branch.media_content_id || "").toLowerCase();
  return (
    title.includes("radio") || type.includes("radio") || id.includes("radio")
  );
}

export function useMediaBrowse(
  entityId: string,
  canBrowsePlayer: boolean,
  showBrowse: boolean,
  isMass = false,
) {
  const browseMedia = useBrowseMedia();
  const browseMediaSource = useBrowseMediaSource();
  const getHassConfig = useHassConfig();
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState("");
  const [playlists, setPlaylists] = useState<MediaChoice[]>([]);
  const [library, setLibrary] = useState<MediaChoice[]>([]);
  const [radio, setRadio] = useState<MediaChoice[]>([]);
  const [radioLabel, setRadioLabel] = useState("Radio");

  useEffect(() => {
    if (!showBrowse) return;

    let cancelled = false;
    setBrowseLoading(true);
    setBrowseError("");

    const browse = (options: {
      entityId: string;
      mediaContentType?: string;
      mediaContentId?: string;
    }) => browseMedia(options).then((result) => asNode(result));

    async function expandBranch(branch: BrowseNode) {
      let nodes = childrenOf(branch);
      if (branch.can_expand && nodes.length === 0 && canExpandBranch(branch)) {
        try {
          const detail = await browse({
            entityId,
            mediaContentType: branch.media_content_type,
            mediaContentId: branch.media_content_id,
          });
          if (!cancelled) nodes = childrenOf(detail);
        } catch {
          nodes = [];
        }
      }
      return {
        branch,
        nodes,
        playlist: isPlaylistBranch(branch),
        radio: isRadioBranch(branch),
      };
    }

    async function collect(root: BrowseNode) {
      const expanded = await Promise.all(childrenOf(root).map(expandBranch));
      const nextPlaylists: MediaChoice[] = [];
      const nextLibrary: MediaChoice[] = [];
      const nextRadio: MediaChoice[] = [];

      for (const { branch, nodes, playlist, radio: radioFolder } of expanded) {
        const items = flattenPlayable(
          nodes,
          playlist ? "playlist" : "music",
          branch.title || "",
        );
        if (playlist) nextPlaylists.push(...items);
        else if (radioFolder) nextRadio.push(...items);
        else nextLibrary.push(...items);
      }

      if (branchCanPlayRoot(root)) {
        nextLibrary.push(
          ...flattenPlayable([root], "music", root.title || ""),
        );
      }

      return { nextPlaylists, nextLibrary, nextRadio };
    }

    async function browseMassFallback(): Promise<BrowseNode | null> {
      const listings = await Promise.all(
        MASS_LIBRARY_FOLDERS.map(async (id) => {
          try {
            return await browse({
              entityId,
              mediaContentType: "music_assistant",
              mediaContentId: id,
            });
          } catch {
            return null;
          }
        }),
      );
      const children = listings.filter((item): item is BrowseNode =>
        Boolean(item),
      );
      if (children.length === 0) return null;
      return {
        title: "Music Assistant",
        media_content_type: "music_assistant",
        media_content_id: "library",
        can_play: false,
        can_expand: true,
        children,
      };
    }

    void (async () => {
      let playerError: unknown;
      let nextPlaylists: MediaChoice[] = [];
      let nextLibrary: MediaChoice[] = [];
      let nextRadio: MediaChoice[] = [];

      try {
        if (canBrowsePlayer) {
          try {
            let root: BrowseNode | null = null;
            try {
              root = await browse({ entityId });
            } catch (rootError) {
              if (!isMass) throw rootError;
              root = await browseMassFallback();
              if (!root) throw rootError;
            }
            if (!root) {
              root = isMass ? await browseMassFallback() : null;
            }
            if (!root) throw new Error("Browse failed");
            if (cancelled) return;
            const collected = await collect(root);
            nextPlaylists = collected.nextPlaylists;
            nextLibrary = collected.nextLibrary;
            nextRadio = collected.nextRadio;
          } catch (error) {
            playerError = error;
          }
        }

        let hassCountry: string | null | undefined;
        try {
          const config = await getHassConfig();
          hassCountry = config.country;
        } catch {
          hassCountry = undefined;
        }
        const countryCode = preferredCountryCode(hassCountry);
        const radioResult = await loadRadioBrowserStations(
          browseMediaSource,
          countryCode,
        );
        if (cancelled) return;

        const seen = new Set(nextRadio.map((item) => `${item.type}::${item.id}`));
        for (const station of radioResult.stations) {
          const key = `${station.type}::${station.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          nextRadio.push(station);
        }

        if (cancelled) return;
        setPlaylists(nextPlaylists);
        setLibrary(nextLibrary);
        setRadio(nextRadio);
        if (radioResult.countryLabel) setRadioLabel(radioResult.countryLabel);

        if (
          nextPlaylists.length === 0 &&
          nextLibrary.length === 0 &&
          nextRadio.length === 0 &&
          playerError
        ) {
          setBrowseError(browseErrorMessage(playerError));
        }
      } catch (error: unknown) {
        if (cancelled) return;
        setPlaylists([]);
        setLibrary([]);
        setRadio([]);
        setBrowseError(browseErrorMessage(error));
      } finally {
        if (!cancelled) setBrowseLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    showBrowse,
    canBrowsePlayer,
    entityId,
    browseMedia,
    browseMediaSource,
    getHassConfig,
    isMass,
  ]);

  return { browseLoading, browseError, playlists, library, radio, radioLabel };
}
