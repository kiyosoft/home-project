import { useEffect, useState, type KeyboardEvent } from "react";
import { z } from "zod";

import {
  defineWidget,
  useLock,
  type UseLockResult,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { cx, useElementSize } from "../ui";
import { Padlock } from "./lock/Padlock";
import { lockVisuals } from "./lock/lock-visuals";

export const lockConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

/** Below this the big status line crowds the padlock out. */
const COMPACT_HEIGHT = 208;
/** A lock that never echoes its new state should not hold the pose forever. */
const CONFIRM_TIMEOUT_MS = 4000;

function LockWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId =
    typeof config.entity_id === "string" ? config.entity_id : "";
  const customTitle =
    typeof config.title === "string" ? config.title.trim() : "";
  const lock = useLock(entityId);

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

  return (
    <LockCard lock={lock} customTitle={customTitle} interactive={interactive} />
  );
}

interface LockCardProps {
  lock: UseLockResult;
  customTitle: string;
  interactive: boolean;
}

/**
 * Split from the widget so the pose and its pending tap live behind the checks
 * for a missing or unavailable entity.
 */
function LockCard({ lock, customTitle, interactive }: LockCardProps) {
  const [cardRef, cardSize] = useElementSize<HTMLDivElement>();
  const [pending, setPending] = useState(false);
  // The padlock moves on tap; Home Assistant confirms a few hundred ms later.
  const [wanted, setWanted] = useState<boolean | null>(null);
  const visuals = lockVisuals(lock);

  useEffect(() => {
    if (wanted === null) return;
    if (visuals.open === wanted || visuals.jammed) {
      setWanted(null);
      return;
    }
    const timer = window.setTimeout(() => setWanted(null), CONFIRM_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [wanted, visuals.open, visuals.jammed]);

  const displayTitle =
    customTitle ||
    (typeof lock.attributes.friendly_name === "string"
      ? lock.attributes.friendly_name
      : lock.entityId);

  const shownOpen = wanted ?? visuals.open;
  const canToggle = interactive && !pending && !visuals.busy;
  const compact = cardSize.height > 0 && cardSize.height < COMPACT_HEIGHT;

  async function run(action: () => Promise<void>) {
    if (!interactive || pending) return;
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  async function toggle() {
    if (!canToggle) return;
    const next = !shownOpen;
    setWanted(next);
    setPending(true);
    try {
      await (next ? lock.unlock() : lock.lock());
    } catch {
      // The call never landed, so fall back to whatever the lock reports.
      setWanted(null);
    } finally {
      setPending(false);
    }
  }

  // Reads off the pose rather than whether the lock is mid-travel, so the line
  // does not swap under the user while the bolt moves.
  const footNote = interactive
    ? `${shownOpen ? "Tap to lock" : "Tap to unlock"} · ${
        lock.changedBy ?? lock.entityId
      }`
    : lock.entityId;

  const body = (
    <>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Lock
        </p>
        <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight">
          {displayTitle}
        </h3>
        <p
          className={cx(
            "mt-1 font-display font-semibold leading-none tracking-tight",
            compact ? "text-xl" : "text-2xl",
          )}
        >
          {visuals.label}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Padlock
          open={shownOpen}
          jammed={visuals.jammed}
          className={cx(
            "h-full max-h-44 w-full",
            "motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
            visuals.glyph,
          )}
        />
      </div>

      {interactive && lock.supportsOpen ? (
        <button
          type="button"
          disabled={pending}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            void run(() => lock.open());
          }}
          className="inline-flex h-9 w-full shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-sm hover:bg-muted disabled:opacity-50"
        >
          Open
        </button>
      ) : (
        <p className="shrink-0 truncate text-xs text-muted-foreground">
          {footNote}
        </p>
      )}
    </>
  );

  const cardClass = cx(
    "flex h-full min-h-36 w-full flex-col rounded-2xl border text-left text-card-foreground shadow-sm",
    "motion-safe:transition-[background-color,border-color,color] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
    compact ? "gap-2 p-4" : "gap-3 p-5",
    visuals.card,
  );

  if (!interactive) {
    return (
      <div ref={cardRef} className={cardClass}>
        {body}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      role="switch"
      aria-checked={!shownOpen}
      aria-label={displayTitle}
      aria-disabled={!canToggle}
      tabIndex={0}
      onClick={() => void toggle()}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        void toggle();
      }}
      className={cx(
        cardClass,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        canToggle ? "cursor-pointer hover:border-primary/30" : "cursor-default",
      )}
    >
      {body}
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
