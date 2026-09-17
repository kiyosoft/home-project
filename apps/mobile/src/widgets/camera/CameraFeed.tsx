import { CameraHls } from "./CameraHls";
import { CameraLive } from "./CameraLive";

/**
 * Live video is HA's MJPEG proxy — same as the dashboard `<img>`. HLS is only
 * for sound; MJPEG has no audio track.
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
  if (sound && hlsUri) {
    return (
      <CameraHls
        uri={hlsUri}
        label={label}
        fill={fill}
        muted={false}
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
