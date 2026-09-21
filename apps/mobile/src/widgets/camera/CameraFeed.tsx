import { CameraHls } from "./CameraHls";
import { CameraLive } from "./CameraLive";

/**
 * STREAM cameras (RTSP remuxed by HA) play HLS. MJPEG is the native feed
 * otherwise, and the fallback if HLS is not on screen.
 */
export function CameraFeed({
  mjpegUri,
  hlsUri,
  sound,
  label,
  fill = false,
  nativeControls = false,
  onMjpegFailed,
  onHlsFailed,
  onMjpegReady,
}: {
  mjpegUri: string | null;
  hlsUri: string | null;
  sound: boolean;
  label: string;
  fill?: boolean;
  nativeControls?: boolean;
  onMjpegFailed: () => void;
  onHlsFailed?: () => void;
  onMjpegReady?: () => void;
}) {
  if (hlsUri) {
    return (
      <CameraHls
        uri={hlsUri}
        label={label}
        fill={fill}
        muted={!sound}
        nativeControls={nativeControls}
        onFailed={onHlsFailed ?? (() => {})}
      />
    );
  }
  if (mjpegUri) {
    return (
      <CameraLive
        uri={mjpegUri}
        label={label}
        fill={fill}
        showSpinner
        onFailed={onMjpegFailed}
        onReady={onMjpegReady}
      />
    );
  }
  return null;
}
