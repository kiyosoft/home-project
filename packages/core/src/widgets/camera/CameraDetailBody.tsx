import { useState } from "react";

import { useCamera } from "@ethio/plugin-sdk";

export function CameraDetailBody({ entityId }: { entityId: string }) {
  const camera = useCamera(entityId);
  const [streaming, setStreaming] = useState(false);
  const [pending, setPending] = useState(false);

  if (!camera) {
    return <p className="text-sm text-muted-foreground">Camera unavailable</p>;
  }

  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  const showStream = streaming && Boolean(camera.streamUrl);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-muted">
        {showStream ? (
          <img
            src={camera.streamUrl ?? undefined}
            alt={`${camera.entityId} stream`}
            className="aspect-video w-full object-cover"
          />
        ) : camera.stillUrl ? (
          <img
            src={camera.stillUrl}
            alt={camera.entityId}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
            No image available
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => camera.refreshImage()}
          className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Refresh still
        </button>
        {camera.supportsStream ? (
          <button
            type="button"
            onClick={() => setStreaming((value) => !value)}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            {streaming ? "Show still" : "Live MJPEG"}
          </button>
        ) : null}
        {camera.supportsOnOff ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              void run(() => (camera.isOn ? camera.turnOff() : camera.turnOn()))
            }
            className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
          >
            {camera.isOn ? "Turn off" : "Turn on"}
          </button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {[camera.brand, camera.model].filter(Boolean).join(" · ") ||
          camera.entityId}
      </p>
    </div>
  );
}
