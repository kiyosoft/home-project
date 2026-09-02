import { Camera as CameraIcon, RefreshCw } from "lucide-react";
import type { MouseEvent } from "react";
import { useState } from "react";
import { z } from "zod";
import {
  defineWidget,
  PluginScope,
  useCamera,
  useDetailModal,
  usePluginId,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { CameraDetailBody } from "./camera/CameraDetailBody";
import { widgetEntityId, widgetTitle } from "./names";
import { WidgetPlaceholder } from "./WidgetPlaceholder";

export const cameraConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

function CameraWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const camera = useCamera(entityId);
  const detailModal = useDetailModal();
  const pluginId = usePluginId();
  const [imageFailed, setImageFailed] = useState(false);

  if (!entityId) {
    return (
      <WidgetPlaceholder
        title={customTitle || "Camera"}
        message="Pick a camera entity in settings."
      />
    );
  }

  if (!camera) {
    return (
      <WidgetPlaceholder
        title={customTitle || entityId}
        message="Entity unavailable"
        dashed
      />
    );
  }

  const displayTitle =
    customTitle ||
    (typeof camera.attributes.friendly_name === "string"
      ? camera.attributes.friendly_name
      : camera.entityId);

  function openDetail() {
    if (!interactive || !pluginId) return;
    detailModal.open({
      title: displayTitle,
      description: "Camera",
      className: "max-w-2xl",
      body: (
        <PluginScope pluginId={pluginId}>
          <CameraDetailBody entityId={entityId} />
        </PluginScope>
      ),
    });
  }

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? openDetail : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
              }
            }
          : undefined
      }
      className="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
    >
      {camera.stillUrl && !imageFailed ? (
        <img
          src={camera.stillUrl}
          alt={displayTitle}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted">
          <CameraIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">No signal</p>
          {interactive ? (
            <button
              type="button"
              onClick={(event) => {
                stopPropagation(event);
                setImageFailed(false);
                camera.refreshImage();
              }}
              className="rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/55"
            >
              tap to retry
            </button>
          ) : null}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="relative mt-auto flex items-end justify-between gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/70">
            Camera
          </p>
          <h3 className="font-display text-base font-semibold text-white">
            {displayTitle}
          </h3>
          <p className="text-xs capitalize text-white/70">{camera.state}</p>
        </div>
        {interactive ? (
          <button
            type="button"
            onClick={(event) => {
              stopPropagation(event);
              camera.refreshImage();
            }}
            className="rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/55"
            aria-label="Refresh image"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export const cameraWidget = defineWidget({
  id: "@ethio/core/camera",
  name: "Camera",
  description: "Show a camera still and open a live MJPEG stream",
  component: CameraWidget,
  configSchema: cameraConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 4, h: 2, minW: 3, minH: 1, maxW: 8, maxH: 8 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 8, h: 8 },
  entityDomains: ["camera"],
  capabilities: ["entity.read", "service.call"],
});
