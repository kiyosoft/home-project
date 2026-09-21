import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Spinner, Text } from "heroui-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { withUniwind } from "uniwind";

import type { MessageKey } from "@/i18n";
import { useT } from "@/store/locale-store";
import { GlassSurface } from "@/ui/GlassSurface";
import { PressableFeedback } from "@/ui/haptic";
import { CameraFeed } from "@/widgets/camera/CameraFeed";
import { CameraStill } from "@/widgets/camera/CameraStill";
import { pickCameraLiveMode } from "@/widgets/camera/live-mode";
import { useLiveCamera } from "@/widgets/camera/use-camera";
import { CameraDetailBody } from "@/widgets/detail/CameraDetailBody";
import type { WidgetBodyProps } from "@/widgets/types";
import { useTile } from "@/widgets/use-tile";

const Icon = withUniwind(Ionicons);

const WASH: [string, string, string] = [
  "transparent",
  "rgba(0,0,0,0.18)",
  "rgba(0,0,0,0.72)",
];

const STATUS_KEYS: Record<string, MessageKey> = {
  on: "widget.state.on",
  off: "widget.state.off",
  idle: "widget.state.idle",
  streaming: "widget.state.streaming",
  recording: "widget.state.recording",
};

export function CameraTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const { entityId, title, unavailable, sheet } = useTile(config);
  const [streaming, setStreaming] = useState(false);
  const camera = useLiveCamera(entityId, { pollStills: !streaming });
  const compact = size === "sm";
  const state = camera.view?.state.toLowerCase() ?? "";
  const statusKey = STATUS_KEYS[state];
  const liveMode = pickCameraLiveMode({
    streaming: streaming && camera.canLive && !unavailable,
    supportsStream: camera.canAudio,
    sound: camera.sound,
    hlsUri: camera.hlsUri,
    hlsFailed: camera.hlsFailed,
    mjpegUri: camera.streamUrl,
    mjpegFailed: camera.mjpegFailed,
  });
  const live = liveMode === "hls" || liveMode === "mjpeg";
  const waitingForUrl = liveMode === "wait";
  const status = unavailable
    ? t("widget.state.unavailable")
    : streaming
      ? t("widget.camera.live")
      : statusKey
        ? t(statusKey)
        : camera.view?.state;

  const openDetail = () => {
    if (!entityId) return;
    sheet.open({
      title,
      body: <CameraDetailBody entityId={entityId} />,
    });
  };

  const toggleLive = () => {
    if (streaming) {
      setStreaming(false);
      camera.endLive();
      return;
    }
    camera.beginLive();
    setStreaming(true);
  };

  return (
    <PressableFeedback
      onPress={openDetail}
      onLongPress={openDetail}
      isDisabled={unavailable}
      accessibilityLabel={status ? `${title}, ${status}` : title}
      className="flex-1"
    >
      <GlassSurface
        level="tile"
        interactive
        className="flex-1 overflow-hidden"
        style={{ minHeight: compact ? 168 : 200 }}
      >
        <CameraStill
          uri={unavailable ? null : camera.stillUrl}
          label={title}
          className="absolute inset-0"
          emptyLabel={t("widget.camera.noSignal")}
          retryLabel={t("widget.camera.retry")}
          onRetry={camera.refreshImage}
        />
        {live ? (
          <CameraFeed
            mjpegUri={liveMode === "mjpeg" ? camera.streamUrl : null}
            hlsUri={liveMode === "hls" ? camera.hlsUri : null}
            sound={false}
            label={title}
            fill
            onMjpegFailed={() => {
              camera.setMjpegFailed(true);
              setStreaming(false);
            }}
            onHlsFailed={() => camera.setHlsFailed(true)}
            onMjpegReady={() => camera.setMjpegReady(true)}
          />
        ) : null}
        <LinearGradient
          colors={WASH}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        {waitingForUrl ? (
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center bg-black/40"
          >
            <Spinner />
          </View>
        ) : null}
        <View
          pointerEvents="box-none"
          className={`flex-1 justify-end p-4 ${unavailable ? "opacity-50" : ""}`}
        >
          <Text numberOfLines={1} className="text-base font-medium text-white">
            {title}
          </Text>
          {status ? (
            <Text numberOfLines={1} className="text-sm text-white/70">
              {status}
            </Text>
          ) : null}
        </View>
        <View
          pointerEvents="box-none"
          className="absolute top-3 right-3 left-3 flex-row items-start justify-between"
        >
          {streaming ? (
            <View
              pointerEvents="none"
              className="flex-row items-center gap-1.5 rounded-full bg-black/45 px-2 py-1"
            >
              <View className="size-1.5 rounded-full bg-red-500" />
              <Text className="text-[10px] font-semibold uppercase tracking-widest text-white">
                {t("widget.camera.live")}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {camera.canLive && !unavailable ? (
            <PressableFeedback
              onPress={toggleLive}
              haptic="toggle"
              accessibilityLabel={
                streaming ? t("widget.camera.still") : t("widget.camera.live")
              }
              accessibilityRole="switch"
              accessibilityState={{ selected: streaming }}
              className="size-8 items-center justify-center rounded-full bg-black/45"
            >
              <Icon
                name={streaming ? "videocam" : "videocam-outline"}
                size={18}
                className="text-white"
              />
            </PressableFeedback>
          ) : null}
        </View>
      </GlassSurface>
    </PressableFeedback>
  );
}
