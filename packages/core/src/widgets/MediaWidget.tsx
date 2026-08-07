import {
  Pause,
  Play,
  Power,
  SkipBack,
  SkipForward,
  Speaker,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { z } from "zod";

import {
  defineWidget,
  PluginScope,
  resolveEntityImageUrl,
  useBaseUrl,
  useBrowseMedia,
  useCallService,
  useDetailModal,
  useEntity,
  usePluginId,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const mediaConfigSchema = z.object({
  entity_id: z.string().min(1, "Entity is required"),
  artworkMode: z.enum(["default", "cover"]).default("default"),
});

const MEDIA_PLAYER_FEATURE = {
  SEEK: 2,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  BROWSE_MEDIA: 131072,
} as const;

interface MediaChoice {
  id: string;
  label: string;
  type: string;
  source: string;
  image: string | null;
}

function getFriendlyName(entity: {
  entity_id: string;
  attributes: Record<string, unknown>;
}): string {
  const name = entity.attributes.friendly_name;
  if (typeof name === "string" && name.trim()) return name;
  return entity.entity_id;
}

function strAttr(
  attrs: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim() ? value : undefined;
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

function supportsFeature(
  supportedFeatures: number,
  bit: number,
): boolean {
  return (supportedFeatures & bit) !== 0;
}

function getPowerAction(
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

function isMediaActive(state: string, hasMedia: boolean): boolean {
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

function isMusicAssistantPlayer(
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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function flattenPlayable(
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

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

function MediaDetailBody({
  entityId,
  artworkMode,
}: {
  entityId: string;
  artworkMode: "default" | "cover";
}) {
  const entity = useEntity(entityId);
  const callService = useCallService();
  const browseMedia = useBrowseMedia();
  const baseUrl = useBaseUrl();
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState("");
  const [playlists, setPlaylists] = useState<MediaChoice[]>([]);
  const [library, setLibrary] = useState<MediaChoice[]>([]);
  const [showBrowse, setShowBrowse] = useState(false);
  const [pending, setPending] = useState(false);

  const attrs = entity?.attributes ?? {};
  const state = entity?.state ?? "unavailable";
  const supportedFeatures = numAttr(attrs, "supported_features") ?? 0;
  const isPlaying = state === "playing";
  const title = strAttr(attrs, "media_title");
  const artist = strAttr(attrs, "media_artist");
  const album = strAttr(attrs, "media_album_name");
  const active =
    state !== "off" &&
    isMediaActive(state, Boolean(title || artist));
  const picture = resolveEntityImageUrl(
    strAttr(attrs, "entity_picture"),
    baseUrl,
  );
  const volume = numAttr(attrs, "volume_level") ?? 0;
  const muted = Boolean(attrs.is_volume_muted);
  const duration = numAttr(attrs, "media_duration");
  const position = numAttr(attrs, "media_position");
  const powerAction = entity
    ? getPowerAction(state, supportedFeatures)
    : null;
  const canBrowse = supportsFeature(
    supportedFeatures,
    MEDIA_PLAYER_FEATURE.BROWSE_MEDIA,
  );
  const canSeek = supportsFeature(supportedFeatures, MEDIA_PLAYER_FEATURE.SEEK);
  const canVolume = supportsFeature(
    supportedFeatures,
    MEDIA_PLAYER_FEATURE.VOLUME_SET,
  );
  const canMute = supportsFeature(
    supportedFeatures,
    MEDIA_PLAYER_FEATURE.VOLUME_MUTE,
  );
  const isMass = isMusicAssistantPlayer(entityId, attrs);

  useEffect(() => {
    if (!showBrowse || !canBrowse) return;
    let cancelled = false;

    async function loadBrowse() {
      setBrowseLoading(true);
      setBrowseError("");
      try {
        const root = await browseMedia({ entityId });
        const children = Array.isArray(root.children) ? root.children : [];
        const nextPlaylists: MediaChoice[] = [];
        const nextLibrary: MediaChoice[] = [];

        for (const branch of children) {
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

        if (!cancelled) {
          setPlaylists(nextPlaylists);
          setLibrary(nextLibrary);
        }
      } catch (error) {
        if (!cancelled) {
          setBrowseError(
            error instanceof Error ? error.message : "Browse failed",
          );
        }
      } finally {
        if (!cancelled) setBrowseLoading(false);
      }
    }

    void loadBrowse();
    return () => {
      cancelled = true;
    };
  }, [showBrowse, canBrowse, entityId, browseMedia]);

  async function run(
    service: string,
    data: Record<string, unknown> = {},
  ) {
    if (pending) return;
    setPending(true);
    try {
      await callService("media_player", service, {
        entity_id: entityId,
        ...data,
      });
    } finally {
      setPending(false);
    }
  }

  async function playChoice(choice: MediaChoice) {
    await run("play_media", {
      media_content_id: choice.id,
      media_content_type: choice.type || "music",
    });
    setShowBrowse(false);
  }

  if (!entity) {
    return (
      <p className="text-sm text-muted-foreground">Entity unavailable</p>
    );
  }

  const coverMode = artworkMode === "cover" && Boolean(picture);

  return (
    <div className="space-y-5">
      <div
        className={`relative overflow-hidden rounded-2xl border border-border ${
          coverMode ? "min-h-56 text-white" : "bg-muted/40"
        }`}
      >
        {picture ? (
          <img
            src={picture}
            alt=""
            className={
              coverMode
                ? "absolute inset-0 h-full w-full object-cover"
                : "mx-auto mt-5 h-40 w-40 rounded-xl object-cover shadow-md"
            }
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Speaker className="h-10 w-10" />
          </div>
        )}
        {coverMode ? (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        ) : null}
        <div
          className={`relative space-y-1 p-5 ${coverMode ? "mt-28" : "pt-4"}`}
        >
          <p className="font-display text-lg font-semibold tracking-tight">
            {title || (active ? "Active" : "Nothing playing")}
          </p>
          {artist ? (
            <p
              className={`text-sm ${coverMode ? "text-white/80" : "text-muted-foreground"}`}
            >
              {artist}
              {album ? ` · ${album}` : ""}
            </p>
          ) : null}
          <p
            className={`text-xs uppercase tracking-[0.14em] ${
              coverMode ? "text-white/70" : "text-muted-foreground"
            }`}
          >
            {getFriendlyName(entity)} · {state}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => void run("media_previous_track")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-muted disabled:opacity-50"
          aria-label="Previous track"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void run("media_play_pause")}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 pl-0.5" />
          )}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void run("media_next_track")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-muted disabled:opacity-50"
          aria-label="Next track"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        {powerAction ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void run(powerAction)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-muted disabled:opacity-50"
            aria-label={powerAction === "turn_off" ? "Power off" : "Power on"}
          >
            <Power className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {canSeek && duration != null && duration > 0 ? (
        <label className="block space-y-2 text-sm">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(position ?? 0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step={1}
            value={Math.min(position ?? 0, duration)}
            disabled={pending}
            onChange={(event) => {
              void run("media_seek", {
                seek_position: Number(event.target.value),
              });
            }}
            className="w-full accent-primary"
          />
        </label>
      ) : null}

      {canVolume ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pending || !canMute}
            onClick={() =>
              void run("volume_mute", { is_volume_muted: !muted })
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-muted disabled:opacity-50"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            disabled={pending}
            onChange={(event) => {
              void run("volume_set", {
                volume_level: Number(event.target.value) / 100,
              });
            }}
            className="w-full accent-primary"
            aria-label="Volume"
          />
          <span className="w-10 text-right text-xs text-muted-foreground">
            {Math.round(volume * 100)}%
          </span>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Library</p>
            <p className="text-xs text-muted-foreground">
              {isMass
                ? "Browse Music Assistant playlists and library"
                : canBrowse
                  ? "Browse media on this player"
                  : "This player does not expose browse_media"}
            </p>
          </div>
          <button
            type="button"
            disabled={!canBrowse || pending}
            onClick={() => setShowBrowse((prev) => !prev)}
            className="rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            {showBrowse ? "Hide" : "Choose"}
          </button>
        </div>

        {showBrowse ? (
          <div className="max-h-64 space-y-4 overflow-y-auto rounded-xl border border-border p-3">
            {browseLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : null}
            {browseError ? (
              <p className="text-sm text-destructive">{browseError}</p>
            ) : null}
            {!browseLoading && !browseError ? (
              <>
                <BrowseSection
                  title="Playlists"
                  items={playlists}
                  baseUrl={baseUrl}
                  onPlay={(choice) => void playChoice(choice)}
                />
                <BrowseSection
                  title="Library"
                  items={library}
                  baseUrl={baseUrl}
                  onPlay={(choice) => void playChoice(choice)}
                />
                {playlists.length === 0 && library.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No playable media found.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function branchCanPlayRoot(root: {
  can_play?: boolean;
  media_content_id?: string;
}): boolean {
  return Boolean(root.can_play && root.media_content_id);
}

function BrowseSection({
  title,
  items,
  baseUrl,
  onPlay,
}: {
  title: string;
  items: MediaChoice[];
  baseUrl: string;
  onPlay: (choice: MediaChoice) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const image = resolveEntityImageUrl(item.image, baseUrl);
          return (
            <li key={`${item.type}:${item.id}`}>
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
              >
                {image ? (
                  <img
                    src={image}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Speaker className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.label}
                  </span>
                  {item.source ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.source}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MediaWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const artworkMode =
    config.artworkMode === "cover" ? "cover" : "default";
  const entity = useEntity(entityId);
  const callService = useCallService();
  const detailModal = useDetailModal();
  const pluginId = usePluginId();
  const baseUrl = useBaseUrl();
  const [pending, setPending] = useState(false);

  const attrs = entity?.attributes ?? {};
  const state = entity?.state ?? "unavailable";
  const supportedFeatures = numAttr(attrs, "supported_features") ?? 0;

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">Media</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a media player entity in settings.
        </p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">{entityId}</h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const isPlaying = state === "playing";
  const name = getFriendlyName(entity);
  const title = strAttr(attrs, "media_title");
  const artist =
    strAttr(attrs, "media_artist") ||
    strAttr(attrs, "media_series_title") ||
    strAttr(attrs, "media_album_name");
  const active =
    state !== "off" && isMediaActive(state, Boolean(title || artist));
  const picture = resolveEntityImageUrl(
    strAttr(attrs, "entity_picture"),
    baseUrl,
  );
  const powerAction = getPowerAction(state, supportedFeatures);
  const canPrev = supportsFeature(
    supportedFeatures,
    MEDIA_PLAYER_FEATURE.PREVIOUS_TRACK,
  );
  const canNext = supportsFeature(
    supportedFeatures,
    MEDIA_PLAYER_FEATURE.NEXT_TRACK,
  );
  const coverMode = artworkMode === "cover" && Boolean(picture);
  const lightOnArt = Boolean(picture);

  async function run(service: string) {
    if (!interactive || pending) return;
    setPending(true);
    try {
      await callService("media_player", service, { entity_id: entityId });
    } finally {
      setPending(false);
    }
  }

  function openDetail() {
    if (!interactive || !pluginId) return;
    detailModal.open({
      title: name,
      description: "Media player",
      className: "max-w-lg",
      body: (
        <PluginScope pluginId={pluginId}>
          <MediaDetailBody entityId={entityId} artworkMode={artworkMode} />
        </PluginScope>
      ),
    });
  }

  if (!active) {
    return (
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? openDetail : undefined}
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDetail();
                }
              }
            : undefined
        }
        className={`flex h-full min-h-36 flex-col items-center justify-center rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm outline-none transition-colors ${
          interactive
            ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
            : ""
        }`}
      >
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Speaker className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Nothing playing</p>
        <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
          {name}
        </h3>
        {interactive && powerAction === "turn_on" ? (
          <button
            type="button"
            disabled={pending}
            onClick={(event) => {
              stopPropagation(event);
              void run("turn_on");
            }}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 text-sm hover:bg-muted disabled:opacity-50"
          >
            <Power className="h-4 w-4" />
            Power on
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? openDetail : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
              }
            }
          : undefined
      }
      className={`relative flex h-full min-h-36 flex-col justify-between overflow-hidden rounded-2xl border border-border shadow-sm outline-none transition-colors ${
        interactive
          ? "cursor-pointer hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          : ""
      } ${lightOnArt ? "text-white" : "bg-card text-card-foreground"}`}
    >
      {picture ? (
        <>
          <img
            src={picture}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover ${
              coverMode ? "" : "scale-110 blur-xl"
            }`}
          />
          <div
            className={`absolute inset-0 ${
              coverMode
                ? "bg-gradient-to-t from-black/80 via-black/35 to-black/10"
                : "bg-black/45"
            }`}
          />
        </>
      ) : null}

      <div className="relative flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <p
            className={`text-xs uppercase tracking-[0.14em] ${
              lightOnArt ? "text-white/70" : "text-muted-foreground"
            }`}
          >
            Media
          </p>
          <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight">
            {name}
          </h3>
        </div>
        {!coverMode ? (
          picture ? (
            <img
              src={picture}
              alt=""
              className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-md"
            />
          ) : (
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Speaker className="h-4 w-4" />
            </div>
          )
        ) : null}
      </div>

      <div className="relative space-y-1 px-5 pt-4">
        <p className="truncate font-display text-lg font-semibold tracking-tight">
          {title || "Active"}
        </p>
        {artist ? (
          <p
            className={`truncate text-sm ${
              lightOnArt ? "text-white/80" : "text-muted-foreground"
            }`}
          >
            {artist}
          </p>
        ) : null}
      </div>

      {interactive ? (
        <div className="relative mt-auto flex items-center justify-center gap-2 p-5 pt-4">
          {canPrev ? (
            <button
              type="button"
              disabled={pending}
              onClick={(event) => {
                stopPropagation(event);
                void run("media_previous_track");
              }}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                lightOnArt
                  ? "text-white/85 hover:bg-white/15"
                  : "border border-border hover:bg-muted"
              }`}
              aria-label="Previous track"
            >
              <SkipBack className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={(event) => {
              stopPropagation(event);
              void run("media_play_pause");
            }}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-105 disabled:opacity-50 ${
              coverMode
                ? "border border-white/30 bg-white/20 text-white backdrop-blur-md"
                : "bg-white text-black"
            }`}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 pl-0.5" />
            )}
          </button>
          {canNext ? (
            <button
              type="button"
              disabled={pending}
              onClick={(event) => {
                stopPropagation(event);
                void run("media_next_track");
              }}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                lightOnArt
                  ? "text-white/85 hover:bg-white/15"
                  : "border border-border hover:bg-muted"
              }`}
              aria-label="Next track"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          ) : null}
          {powerAction ? (
            <button
              type="button"
              disabled={pending}
              onClick={(event) => {
                stopPropagation(event);
                void run(powerAction);
              }}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                lightOnArt
                  ? "text-white/85 hover:bg-white/15"
                  : "border border-border hover:bg-muted"
              }`}
              aria-label={
                powerAction === "turn_off" ? "Power off" : "Power on"
              }
            >
              <Power className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="p-5 pt-4" />
      )}
    </div>
  );
}

export const mediaWidget = defineWidget({
  id: "@ethio/core/media",
  name: "Media",
  description:
    "Control a media player (HomePod, Sonos, Music Assistant, and more)",
  component: MediaWidget,
  configSchema: mediaConfigSchema,
  defaultConfig: { entity_id: "", artworkMode: "default" },
  defaultSize: { w: 4, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 8 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 8, h: 8 },
  entityDomains: ["media_player"],
  capabilities: ["entity.read", "service.call"],
});
