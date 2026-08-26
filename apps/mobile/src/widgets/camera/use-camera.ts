import {
  cameraStillPath,
  deriveCamera,
  entityImageUrl,
  requestCameraStream,
  withAuthToken,
} from "@ethio/ha-sdk";
import { useCallback, useMemo, useState } from "react";

import { savedConnection, useHaStore } from "@/store/ha-store";
import { isUnavailable, useEntity } from "@/store/use-entity";
import { useCallService } from "@/widgets/use-service";

/**
 * Hub-relative paths get the access token. Absolute CDN/demo URLs do not:
 * picsum has no business seeing a long-lived token.
 */
function hubAuthedUrl(
  path: string | null | undefined,
  baseUrl: string,
  extraToken?: string,
): string | null {
  const url = entityImageUrl(path, baseUrl);
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  if (!baseUrl || !url.startsWith(baseUrl)) return url;
  return withAuthToken(url, extraToken || savedConnection()?.token);
}

export function useCamera(entityId: string) {
  const entity = useEntity(entityId);
  const view = useMemo(() => deriveCamera(entity), [entity]);
  const baseUrl = useHaStore((state) => state.baseUrl);
  const mode = useHaStore((state) => state.mode);
  const sendMessagePromise = useHaStore((state) => state.sendMessagePromise);
  const callService = useCallService();
  const [refreshKey, setRefreshKey] = useState(0);

  const stillUrl = useMemo(() => {
    if (!view) return null;
    const path = cameraStillPath(view.entityId, view.entityPicture);
    const url = hubAuthedUrl(path, baseUrl, view.accessToken);
    if (!url) return null;
    if (url.startsWith("data:")) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${refreshKey}`;
  }, [view, baseUrl, refreshKey]);

  const refreshImage = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const turnOn = useCallback(() => {
    callService("camera", "turn_on", { entity_id: entityId });
  }, [callService, entityId]);

  const turnOff = useCallback(() => {
    callService("camera", "turn_off", { entity_id: entityId });
  }, [callService, entityId]);

  const startLive = useCallback(async () => {
    const path = await requestCameraStream(sendMessagePromise, entityId);
    const url = hubAuthedUrl(path, baseUrl);
    if (!url) throw new Error("Camera stream URL could not be resolved");
    return url;
  }, [sendMessagePromise, entityId, baseUrl]);

  return {
    view,
    stillUrl,
    refreshImage,
    turnOn,
    turnOff,
    startLive,
    canLive: mode === "live" && Boolean(view?.supportsStream),
    authToken: savedConnection()?.token ?? "",
    unavailable: isUnavailable(entity),
  };
}
