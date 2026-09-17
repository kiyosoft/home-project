import { Spinner } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { hubOrigin, mjpegPlayerHtml } from "./mjpeg-html";

/**
 * HA's MJPEG proxy (`/api/camera_proxy_stream`) is what the dashboard `<img>`
 * plays. A native video player cannot; this WebView hosts the same `<img>`.
 */
export function CameraLive({
  uri,
  label,
  fill = false,
  showSpinner = true,
  onFailed,
  onReady,
}: {
  uri: string;
  label: string;
  fill?: boolean;
  showSpinner?: boolean;
  onFailed: () => void;
  onReady?: () => void;
}) {
  const html = useMemo(() => mjpegPlayerHtml(uri), [uri]);
  const baseUrl = useMemo(() => hubOrigin(uri), [uri]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [uri]);

  return (
    <View
      style={fill ? styles.fill : styles.frame}
      accessibilityLabel={label}
      pointerEvents="none"
    >
      <WebView
        source={{ html, baseUrl }}
        originWhitelist={["*"]}
        style={styles.player}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled={false}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        mixedContentMode="always"
        cacheEnabled={false}
        automaticallyAdjustContentInsets={false}
        pointerEvents="none"
        onHttpError={onFailed}
        onError={onFailed}
        onMessage={(event) => {
          const data = event.nativeEvent.data;
          if (data === "ready") {
            setReady(true);
            onReady?.();
          } else if (data === "failed") onFailed();
        }}
      />
      {showSpinner && !ready ? (
        <View className="absolute inset-0 items-center justify-center bg-black">
          <Spinner />
        </View>
      ) : null}
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
  player: {
    flex: 1,
    backgroundColor: "#000",
  },
});
