import { cameraStillPath, deriveCamera, requestCameraStream } from "@ethio/ha-sdk";
import { useCallback, useMemo, useState } from "react";

import { useHaStore } from "@/store/ha-store";
import { isUnavailable, useEntity } from "@/store/use-entity";
import { useHubUrl } from "@/widgets/use-hub-url";
import { useCallService } from "@/widgets/use-service";

export function useCamera(entityId: string) {
  const entity = useEntity(entityId);
  const view = useMemo(() => deriveCamera(entity), [entity]);
  const activeUrl = useHaStore((state) => state.activeUrl);
  const mode = useHaStore((state) => state.mode);
  const sendMessagePromise = useHaStore((state) => state.sendMessagePromise);
  const callService = useCallService();
  const [refreshKey, setRefreshKey] = useState(1);

  const stillPath = view
    ? cameraStillPath(view.entityId, view.entityPicture)
    : null;
  const stillUrl = useHubUrl(stillPath, refreshKey);

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
    const base = activeUrl.replace(/\/+$/, "");
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (!base) throw new Error("Camera stream URL could not be resolved");
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  }, [sendMessagePromise, entityId, activeUrl]);

  return {
    view,
    stillUrl,
    refreshImage,
    turnOn,
    turnOff,
    startLive,
    canLive: mode === "live" && Boolean(view?.supportsStream),
    unavailable: isUnavailable(entity),
  };
}
