import { LockKeyhole, Unlock } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import {
  defineWidget,
  useLock,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

export const lockConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

function LockWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle =
    typeof config.title === "string" ? config.title.trim() : "";
  const lock = useLock(entityId);
  const [pending, setPending] = useState(false);

  if (!entityId) {
    return (
      <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <h3 className="font-display text-base font-semibold">
          {customTitle || "Lock"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a lock entity in settings.
        </p>
      </div>
    );
  }

  if (!lock) {
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
    (typeof lock.attributes.friendly_name === "string"
      ? lock.attributes.friendly_name
      : lock.entityId);

  const statusLabel = lock.isLocked
    ? "Locked"
    : lock.isUnlocked
      ? "Unlocked"
      : lock.isLocking
        ? "Locking…"
        : lock.isUnlocking
          ? "Unlocking…"
          : lock.isJammed
            ? "Jammed"
            : "Unknown";

  async function run(action: () => Promise<void>) {
    if (!interactive || pending) return;
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  const Icon = lock.isLocked ? LockKeyhole : Unlock;

  return (
    <div className="flex h-full min-h-36 flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Lock
          </p>
          <h3 className="mt-1 font-display text-base font-semibold tracking-tight">
            {displayTitle}
          </h3>
        </div>
        <div
          className={`rounded-full p-2 ${
            lock.isLocked
              ? "bg-primary/10 text-primary"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
        {statusLabel}
      </p>
      {lock.changedBy ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Changed by {lock.changedBy}
        </p>
      ) : null}
      {interactive ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <button
            type="button"
            disabled={pending || lock.isLocked || lock.isLocking}
            onClick={() => void run(() => lock.lock())}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 text-sm hover:bg-muted disabled:opacity-50"
          >
            Lock
          </button>
          <button
            type="button"
            disabled={pending || lock.isUnlocked || lock.isUnlocking}
            onClick={() => void run(() => lock.unlock())}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-border bg-muted/50 text-sm hover:bg-muted disabled:opacity-50"
          >
            Unlock
          </button>
          {lock.supportsOpen ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void run(() => lock.open())}
              className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-border bg-muted/50 text-sm hover:bg-muted disabled:opacity-50"
            >
              Open
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const lockWidget = defineWidget({
  id: "@ethio/core/lock",
  name: "Lock",
  description: "Lock and unlock smart locks",
  component: LockWidget,
  configSchema: lockConfigSchema,
  defaultConfig: { title: "", entity_id: "" },
  defaultSize: { w: 4, h: 4, minW: 2, minH: 3, maxW: 8, maxH: 6 },
  minSize: { w: 2, h: 3 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["lock"],
  capabilities: ["entity.read", "service.call"],
});
