import {
  cameraMjpegPath,
  cameraMjpegUrl,
  cameraStillPath,
  deriveCamera,
  requestCameraHlsUrl,
} from "@ethio/ha-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

import { useHaStore } from "@/store/ha-store";
import { isUnavailable, useEntity } from "@/store/use-entity";
import { useHubUrl } from "@/widgets/use-hub-url";
import { useCallService } from "@/widgets/use-service";

/** Live MJPEG can stay open on the detail sheet longer than a still refresh. */
const STREAM_SIGNATURE_TTL_SECONDS = 3600;

/** Middle of the 5–10s still cadence. Cheap enough over a tunnel, fresh enough on a tile. */
export const STILL_POLL_MS = 8_000;

export function useCamera(
  entityId: string,
  { pollStills = false }: { pollStills?: boolean } = {},
) {
  const entity = useEntity(entityId);
  const view = useMemo(() => deriveCamera(entity), [entity]);
  const activeUrl = useHaStore((state) => state.activeUrl);
  const mode = useHaStore((state) => state.mode);
  const sendMessagePromise = useHaStore((state) => state.sendMessagePromise);
  const callService = useCallService();
  const unavailable = isUnavailable(entity);
  const [refreshKey, setRefreshKey] = useState(1);

  const stillPath = view
    ? cameraStillPath(view.entityId, view.entityPicture)
    : null;
  const stillUrl = useHubUrl(stillPath, refreshKey);

  const tokenStreamUrl = useMemo(() => {
    if (!view?.accessToken || mode !== "live" || !activeUrl) return null;
    return cameraMjpegUrl(view.entityId, activeUrl, view.accessToken);
  }, [view, mode, activeUrl]);

  const signedStreamUrl = useHubUrl(
    view && mode === "live" && !tokenStreamUrl
      ? cameraMjpegPath(view.entityId)
      : null,
    0,
    STREAM_SIGNATURE_TTL_SECONDS,
  );

  const refreshImage = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!pollStills || mode !== "live" || unavailable) return;
    const id = setInterval(() => {
      if (AppState.currentState !== "active") return;
      setRefreshKey((key) => key + 1);
    }, STILL_POLL_MS);
    return () => clearInterval(id);
  }, [pollStills, mode, unavailable]);

  const turnOn = useCallback(() => {
    callService("camera", "turn_on", { entity_id: entityId });
  }, [callService, entityId]);

  const turnOff = useCallback(() => {
    callService("camera", "turn_off", { entity_id: entityId });
  }, [callService, entityId]);

  const startHls = useCallback(async () => {
    if (!activeUrl) throw new Error("Camera stream URL could not be resolved");
    return requestCameraHlsUrl(sendMessagePromise, entityId, activeUrl);
  }, [sendMessagePromise, entityId, activeUrl]);

  return {
    view,
    stillUrl,
    streamUrl: tokenStreamUrl ?? signedStreamUrl,
    activeUrl,
    refreshImage,
    turnOn,
    turnOff,
    startHls,
    canLive: mode === "live" && Boolean(view),
    canAudio: mode === "live" && Boolean(view?.supportsStream),
    unavailable,
  };
}

/** MJPEG preview plus on-demand HLS when the user wants sound. */
export function useLiveCamera(
  entityId: string,
  options?: { pollStills?: boolean },
) {
  const camera = useCamera(entityId, options);
  const [sound, setSound] = useState(false);
  const [hlsUri, setHlsUri] = useState<string | null>(null);
  const [hlsLoading, setHlsLoading] = useState(false);
  const [hlsFailed, setHlsFailed] = useState(false);
  const [mjpegFailed, setMjpegFailed] = useState(false);
  const [mjpegReady, setMjpegReady] = useState(false);

  const ensureHls = useCallback(async () => {
    if (hlsUri) return hlsUri;
    setHlsLoading(true);
    setHlsFailed(false);
    try {
      const url = await camera.startHls();
      setHlsUri(url);
      return url;
    } catch {
      setHlsFailed(true);
      return null;
    } finally {
      setHlsLoading(false);
    }
  }, [hlsUri, camera.startHls]);

  const toggleSound = useCallback(async () => {
    if (sound) {
      setSound(false);
      return;
    }
    if (!camera.canAudio) return;
    const url = hlsUri ?? (await ensureHls());
    if (url) {
      setHlsFailed(false);
      setSound(true);
    }
  }, [sound, hlsUri, camera.canAudio, ensureHls]);

  const mute = useCallback(() => {
    setSound(false);
  }, []);

  return {
    ...camera,
    sound,
    hlsUri,
    hlsLoading,
    hlsFailed,
    mjpegFailed,
    mjpegReady,
    setMjpegFailed,
    setMjpegReady,
    setHlsFailed,
    ensureHls,
    toggleSound,
    mute,
  };
}
