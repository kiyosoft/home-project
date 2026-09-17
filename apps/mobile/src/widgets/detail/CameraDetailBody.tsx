import { Label, Spinner, Surface, Text } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { useT } from "@/store/locale-store";
import { Button, Switch } from "@/ui/haptic";
import { CameraFeed } from "@/widgets/camera/CameraFeed";
import { CameraStill } from "@/widgets/camera/CameraStill";
import { useLiveCamera } from "@/widgets/camera/use-camera";
import { EntityDetailBody } from "@/widgets/EntityDetailBody";
import { useOptimistic } from "@/widgets/use-optimistic";

export function CameraDetailBody({ entityId }: { entityId: string }) {
  const t = useT();
  const [streaming, setStreaming] = useState(false);
  const camera = useLiveCamera(entityId, { pollStills: !streaming });
  const [isOn, setOptimisticOn] = useOptimistic(camera.view?.isOn ?? false);

  if (!camera.view) {
    return <Text className="text-muted">{t("widget.entityMissing")}</Text>;
  }

  const showLive =
    streaming &&
    camera.canLive &&
    (Boolean(camera.streamUrl) || (camera.sound && Boolean(camera.hlsUri)));
  const waitingForUrl =
    streaming &&
    ((camera.sound && camera.hlsLoading && !camera.hlsUri) ||
      (!camera.sound && !camera.streamUrl && !camera.mjpegFailed));

  return (
    <View className="gap-6">
      <Surface variant="secondary" className="rounded-inner overflow-hidden">
        <View className="relative">
          <CameraStill
            uri={camera.stillUrl}
            label={camera.view.entityId}
            style={{ width: "100%", aspectRatio: 16 / 9 }}
          />
          {showLive ? (
            <CameraFeed
              mjpegUri={camera.mjpegFailed ? null : camera.streamUrl}
              hlsUri={camera.hlsUri}
              sound={camera.sound}
              label={camera.view.entityId}
              fill
              nativeControls={camera.sound}
              onMjpegFailed={() => camera.setMjpegFailed(true)}
              onHlsFailed={() => {
                camera.setHlsFailed(true);
                camera.mute();
              }}
              onMjpegReady={() => camera.setMjpegReady(true)}
            />
          ) : null}
          {waitingForUrl ? (
            <View className="absolute inset-0 items-center justify-center bg-black/40">
              <Spinner />
            </View>
          ) : null}
        </View>
      </Surface>

      {camera.mjpegFailed && streaming ? (
        <Text className="text-danger text-sm">{t("widget.camera.liveFailed")}</Text>
      ) : null}
      {camera.hlsFailed ? (
        <Text className="text-danger text-sm">
          {t("widget.camera.soundFailed")}
        </Text>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onPress={camera.refreshImage}
          isDisabled={streaming}
        >
          {t("widget.camera.refresh")}
        </Button>
        {camera.canLive ? (
          <Button
            size="sm"
            variant={streaming ? "secondary" : "primary"}
            onPress={() => {
              if (streaming) {
                setStreaming(false);
                camera.setMjpegReady(false);
                if (camera.sound) camera.mute();
                return;
              }
              camera.setMjpegFailed(false);
              setStreaming(true);
            }}
          >
            {streaming ? t("widget.camera.still") : t("widget.camera.live")}
          </Button>
        ) : null}
        {camera.canAudio && streaming ? (
          <Button
            size="sm"
            variant={camera.sound ? "primary" : "secondary"}
            isDisabled={camera.hlsLoading}
            onPress={() => {
              void camera.toggleSound();
            }}
          >
            {camera.sound
              ? t("widget.camera.soundOff")
              : t("widget.camera.soundOn")}
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
