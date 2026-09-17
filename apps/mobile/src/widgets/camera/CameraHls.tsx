import {
  useVideoPlayer,
  VideoView,
  type BufferOptions,
  type VideoSource,
} from "expo-video";
import { Spinner } from "heroui-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

/**
 * HLS carries the camera's audio track and is lighter than MJPEG over a
 * tunnel. Keep the buffer short so playback does not sit far behind live.
 */
const LIVE_BUFFER: BufferOptions = {
  preferredForwardBufferDuration: 2,
  minBufferForPlayback: 0.5,
  prioritizeTimeOverSizeThreshold: true,
  waitsToMinimizeStalling: false,
};

export function CameraHls({
  uri,
  label,
  fill = false,
  muted = false,
  nativeControls = false,
  onFailed,
  onReady,
}: {
  uri: string;
  label: string;
  fill?: boolean;
  muted?: boolean;
  nativeControls?: boolean;
  onFailed: () => void;
  onReady?: () => void;
}) {
  const source: VideoSource = { uri, contentType: "hls" };
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(source, (next) => {
    next.muted = muted;
    next.volume = 1;
    next.audioMixingMode = "auto";
    next.bufferOptions = LIVE_BUFFER;
    next.targetOffsetFromLive = 1;
    next.play();
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    setReady(false);
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") {
        setReady(true);
        onReady?.();
      }
      if (status === "error") onFailed();
    });
    return () => sub.remove();
  }, [player, onFailed, onReady]);

  return (
    <View
      style={fill ? styles.fill : styles.frame}
      pointerEvents={fill ? "none" : "auto"}
    >
      <VideoView
        player={player}
        nativeControls={nativeControls}
        contentFit="cover"
        accessibilityLabel={label}
        style={fill ? styles.fill : styles.frame}
      />
      {ready ? null : (
        <View className="absolute inset-0 items-center justify-center bg-black/50">
          <Spinner />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#000",
  },
  frame: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
  },
});
