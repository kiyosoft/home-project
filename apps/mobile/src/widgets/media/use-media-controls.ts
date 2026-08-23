import type { MediaView } from "@ethio/ha-sdk";

import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";

export interface MediaControls {
  isPlaying: boolean;
  isOff: boolean;
  volumePercent: number;
  isMuted: boolean;
  playPause: () => void;
  skip: (direction: "previous" | "next") => void;
  setPower: (on: boolean) => void;
  /** Mid-drag value, so the slider follows the finger without a call per frame. */
  previewVolume: (percent: number) => void;
  setVolume: (percent: number) => void;
  setMuted: (muted: boolean) => void;
}

/**
 * Transport, volume, and power for one player, shared by the tile and the
 * detail sheet so both paint the same optimistic state off the same calls.
 */
export function useMediaControls(
  entityId: string,
  view: MediaView | null,
  disabled = false,
): MediaControls {
  const callService = useCallService();
  const [state, setOptimisticState] = useOptimistic(view?.state ?? "unknown");
  const [volumePercent, setOptimisticVolume] = useOptimistic(
    view?.volumePercent ?? 0,
  );
  const [isMuted, setOptimisticMuted] = useOptimistic(view?.isMuted ?? false);

  const normalized = state.toLowerCase();
  const isPlaying = normalized === "playing";
  const isOff = normalized === "off";
  const blocked = disabled || !entityId;

  const send = (service: string, data?: Record<string, unknown>) => {
    callService("media_player", service, { entity_id: entityId, ...data });
  };

  return {
    isPlaying,
    isOff,
    volumePercent,
    isMuted,

    playPause() {
      if (blocked) return;
      // A sleeping speaker has nothing to resume, so the same press wakes it.
      if (isOff && view?.powerAction === "turn_on") {
        setOptimisticState("on");
        send("turn_on");
        return;
      }
      setOptimisticState(isPlaying ? "paused" : "playing");
      send("media_play_pause");
    },

    skip(direction) {
      if (blocked) return;
      send(direction === "next" ? "media_next_track" : "media_previous_track");
    },

    setPower(on) {
      if (blocked) return;
      setOptimisticState(on ? "on" : "off");
      send(on ? "turn_on" : "turn_off");
    },

    previewVolume: setOptimisticVolume,

    setVolume(percent) {
      if (blocked) return;
      setOptimisticVolume(percent);
      send("volume_set", { volume_level: percent / 100 });
    },

    setMuted(muted) {
      if (blocked) return;
      setOptimisticMuted(muted);
      send("volume_mute", { is_volume_muted: muted });
    },
  };
}
