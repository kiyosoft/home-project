import { useState, type MouseEvent } from "react";

import {
  PluginScope,
  resolveEntityImageUrl,
  useBaseUrl,
  useCallService,
  useDetailModal,
  useEntity,
  usePluginId,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { MediaActiveCard } from "./MediaActiveCard";
import { MediaDetailBody } from "./MediaDetailBody";
import { MediaIdleCard } from "./MediaIdleCard";
import {
  getFriendlyName,
  getPowerAction,
  isMediaActive,
  MEDIA_PLAYER_FEATURE,
  numAttr,
  strAttr,
  supportsFeature,
} from "./media-utils";

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

export function MediaWidget({
  config,
  interactive = true,
}: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle =
    typeof config.title === "string" ? config.title.trim() : "";
  const artworkMode = config.artworkMode === "cover" ? "cover" : "default";
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
        <h3 className="font-display text-base font-semibold">
          {customTitle || "Media"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a media player entity in settings.
        </p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">
          {customTitle || entityId}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
    );
  }

  const isPlaying = state === "playing";
  const name = customTitle || getFriendlyName(entity);
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
      <MediaIdleCard
        name={name}
        interactive={interactive}
        pending={pending}
        powerAction={powerAction}
        onOpenDetail={openDetail}
        onPowerOn={(event) => {
          stopPropagation(event);
          void run("turn_on");
        }}
      />
    );
  }

  return (
    <MediaActiveCard
      name={name}
      title={title}
      artist={artist}
      picture={picture}
      coverMode={coverMode}
      lightOnArt={lightOnArt}
      interactive={interactive}
      pending={pending}
      isPlaying={isPlaying}
      canPrev={canPrev}
      canNext={canNext}
      powerAction={powerAction}
      onOpenDetail={openDetail}
      onPrev={(event) => {
        stopPropagation(event);
        void run("media_previous_track");
      }}
      onPlayPause={(event) => {
        stopPropagation(event);
        void run("media_play_pause");
      }}
      onNext={(event) => {
        stopPropagation(event);
        void run("media_next_track");
      }}
      onPower={(event) => {
        stopPropagation(event);
        if (powerAction) void run(powerAction);
      }}
    />
  );
}
