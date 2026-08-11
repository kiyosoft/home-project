import { Camera as CameraIcon, RefreshCw } from "lucide-react";
import type { MouseEvent } from "react";
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

export const cameraConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

function CameraWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle =
    typeof config.title === "string" ? config.title.trim() : "";
  const camera = useCamera(entityId);
  const detailModal = useDetailModal();
  const pluginId = usePluginId();

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">
          {customTitle || "Camera"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a camera entity in settings.
        </p>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-dashed border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold">
          {customTitle || entityId}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">Entity unavailable</p>
      </div>
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
      className="group relative flex h-full min-h-36 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
    >
      {camera.stillUrl ? (
        <img
          src={camera.stillUrl}
          alt={displayTitle}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <CameraIcon className="h-8 w-8 text-muted-foreground" />
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
  defaultSize: { w: 4, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 8 },
  minSize: { w: 3, h: 3 },
  maxSize: { w: 8, h: 8 },
  entityDomains: ["camera"],
  capabilities: ["entity.read", "service.call"],
});
