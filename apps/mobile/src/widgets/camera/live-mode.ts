export type CameraLiveMode = "hls" | "mjpeg" | "wait" | "none";

/**
 * STREAM cameras (Generic Camera RTSP, ONVIF, …) are remuxed to HLS.
 * MJPEG is the native feed for cameras without STREAM — and a fallback
 * if HLS fails.
 */
export function pickCameraLiveMode(input: {
  streaming: boolean;
  supportsStream: boolean;
  sound: boolean;
  hlsUri: string | null;
  hlsFailed: boolean;
  mjpegUri: string | null;
  mjpegFailed: boolean;
}): CameraLiveMode {
  if (!input.streaming) return "none";

  const wantHls = input.supportsStream || input.sound;
  if (wantHls && !input.hlsFailed) {
    return input.hlsUri ? "hls" : "wait";
  }

  if (input.mjpegUri && !input.mjpegFailed) return "mjpeg";
  if (!input.mjpegFailed && !input.mjpegUri) return "wait";
  return "none";
}
