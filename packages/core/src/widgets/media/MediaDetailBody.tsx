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
import { useCallback, useState } from "react";

import {
  resolveEntityImageUrl,
  useBaseUrl,
  useCallService,
  useEntity,
} from "@ethio/plugin-sdk";

import { clamp, Slider, useServiceValue } from "../../ui";
import { MediaDetailBrowsePanel } from "./MediaDetailBrowsePanel";
import {
  formatTime,
  getFriendlyName,
  getPowerAction,
  isMediaActive,
  isMusicAssistantPlayer,
  MEDIA_PLAYER_FEATURE,
  numAttr,
  strAttr,
  supportsFeature,
  type MediaChoice,
} from "./media-utils";
import { useMediaBrowse } from "./useMediaBrowse";

export function MediaDetailBody({
  entityId,
  artworkMode,
}: {
  entityId: string;
  artworkMode: "default" | "cover";
}) {
  const entity = useEntity(entityId);
  const callService = useCallService();
  const baseUrl = useBaseUrl();
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
    state !== "off" && isMediaActive(state, Boolean(title || artist));
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
  const canBrowsePlayer = supportsFeature(
    supportedFeatures,
    MEDIA_PLAYER_FEATURE.BROWSE_MEDIA,
  );
  const canPlayMedia = supportsFeature(
    supportedFeatures,
    MEDIA_PLAYER_FEATURE.PLAY_MEDIA,
  );
  const canOpenLibrary = canBrowsePlayer || canPlayMedia;
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
  const { browseLoading, browseError, playlists, library, radio, radioLabel } =
    useMediaBrowse(entityId, canBrowsePlayer, showBrowse, isMass);

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

  // Sliders call the service directly: the shared `pending` gate would swallow
  // updates mid-drag.
  const applySeek = useCallback(
    async (seconds: number) => {
      await callService("media_player", "media_seek", {
        entity_id: entityId,
        seek_position: Math.round(seconds),
      });
    },
    [callService, entityId],
  );

  const applyVolume = useCallback(
    async (percent: number) => {
      await callService("media_player", "volume_set", {
        entity_id: entityId,
        volume_level: clamp(percent, 0, 100) / 100,
      });
    },
    [callService, entityId],
  );

  const seek = useServiceValue(
    Math.min(position ?? 0, duration ?? 0),
    applySeek,
  );
  const volumeControl = useServiceValue(Math.round(volume * 100), applyVolume);

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
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(seek.value)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Slider
            value={Math.min(seek.value, duration)}
            min={0}
            max={duration}
            size="sm"
            label="Seek"
            onValueChange={seek.onValueChange}
            onValueCommit={seek.onValueCommit}
          />
        </div>
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
          <Slider
            value={volumeControl.value}
            min={0}
            max={100}
            label="Volume"
            onValueChange={volumeControl.onValueChange}
            onValueCommit={volumeControl.onValueCommit}
          />
          <span className="w-10 text-right text-xs text-muted-foreground">
            {volumeControl.value}%
          </span>
        </div>
      ) : null}

      <MediaDetailBrowsePanel
        isMass={isMass}
        canOpenLibrary={canOpenLibrary}
        pending={pending}
        showBrowse={showBrowse}
        browseLoading={browseLoading}
        browseError={browseError}
        playlists={playlists}
        library={library}
        radio={radio}
        radioLabel={radioLabel}
        baseUrl={baseUrl}
        onToggleBrowse={() => setShowBrowse((prev) => !prev)}
        onPlay={(choice) => void playChoice(choice)}
      />
    </div>
  );
}
