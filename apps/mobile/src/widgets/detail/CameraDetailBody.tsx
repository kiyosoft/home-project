import {
  useVideoPlayer,
  VideoView,
  type BufferOptions,
  type VideoSource,
} from "expo-video";
import { Label, Spinner, Surface, Text } from "heroui-native";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { Button, Switch } from "@/ui/haptic";
import { CameraStill } from "@/widgets/camera/CameraStill";
import { useCamera } from "@/widgets/camera/use-camera";
import { EntityDetailBody } from "@/widgets/EntityDetailBody";
import { useOptimistic } from "@/widgets/use-optimistic";

type LiveState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "playing"; uri: string }
  | { kind: "failed" };

/**
 * A camera feed is worth more fresh than smooth, so trade rebuffer resistance
 * for latency. The defaults are tuned for on-demand video: Android stacks up
 * 20s of lookahead, and iOS holds playback back until it judges a stall
 * unlikely, which together put the picture several seconds behind the door.
 */
const LIVE_BUFFER: BufferOptions = {
  preferredForwardBufferDuration: 2,
  minBufferForPlayback: 0.5,
  prioritizeTimeOverSizeThreshold: true,
  waitsToMinimizeStalling: false,
};

function LivePlayer({ uri, label }: { uri: string; label: string }) {
  const source: VideoSource = { uri, contentType: "hls" };
  const player = useVideoPlayer(source, (next) => {
    next.muted = true;
    next.bufferOptions = LIVE_BUFFER;
    next.play();
  });

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="cover"
      accessibilityLabel={label}
      style={{ width: "100%", aspectRatio: 16 / 9 }}
    />
  );
}

export function CameraDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const camera = useCamera(entityId);
  const [live, setLive] = useState<LiveState>({ kind: "idle" });
  const [isOn, setOptimisticOn] = useOptimistic(camera.view?.isOn ?? false);

  const stopLive = useCallback(() => {
    setLive({ kind: "idle" });
  }, []);

  const startLive = async () => {
    if (live.kind === "starting") return;
    setLive({ kind: "starting" });
    try {
      const uri = await camera.startLive();
      setLive((current) =>
        current.kind === "starting" ? { kind: "playing", uri } : current,
      );
    } catch {
      setLive((current) =>
        current.kind === "starting" ? { kind: "failed" } : current,
      );
    }
  };

  if (!camera.view) {
    return <Text className="text-muted">{t("widget.entityMissing")}</Text>;
  }

  const playing = live.kind === "playing";
  const starting = live.kind === "starting";

  return (
    <View className="gap-6">
      <Surface variant="secondary" className="rounded-inner overflow-hidden">
        {playing ? (
          <LivePlayer uri={live.uri} label={camera.view.entityId} />
        ) : (
          <View className="relative">
            <CameraStill
              uri={camera.stillUrl}
              label={camera.view.entityId}
              style={{ width: "100%", aspectRatio: 16 / 9 }}
            />
            {starting ? (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                <Spinner />
              </View>
            ) : null}
          </View>
        )}
      </Surface>

      {live.kind === "failed" ? (
        <Text className="text-danger text-sm">{t("widget.camera.liveFailed")}</Text>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onPress={camera.refreshImage}
          isDisabled={playing || starting}
        >
          {t("widget.camera.refresh")}
        </Button>
        {camera.canLive ? (
          <Button
            size="sm"
            variant={playing || starting ? "secondary" : "primary"}
            onPress={() => {
              if (playing || starting) stopLive();
              else void startLive();
            }}
          >
            {playing || starting
              ? t("widget.camera.still")
              : t("widget.camera.live")}
          </Button>
        ) : null}
      </View>

      {camera.view.supportsOnOff ? (
        <Surface
          variant="secondary"
          className="rounded-inner flex-row items-center justify-between p-4"
        >
          <Label>{t("widget.camera.power")}</Label>
          <Switch
            isSelected={isOn}
            onSelectedChange={(next) => {
              setOptimisticOn(next);
              if (next) camera.turnOn();
              else camera.turnOff();
            }}
          />
        </Surface>
      ) : null}

      <EntityDetailBody entityId={entityId} />
    </View>
  );
}
