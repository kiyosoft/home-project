import { useEffect, useState, type KeyboardEvent } from "react";
import { z } from "zod";

import { boundEntityIds, formatAllOrFraction, tallyEntities } from "@ethio/ha-sdk";
import {
  defineWidget,
  useEntities,
  useLock,
  type UseLockResult,
  type WidgetComponentProps,
} from "@ethio/plugin-sdk";

import { Lock } from "lucide-react";

import { cardShellClass, chipShellClass, cx, useCardDensity } from "../ui";
import { ChipFace } from "./ChipFace";
import { Padlock } from "./lock/Padlock";
import { lockVisuals } from "./lock/lock-visuals";
import { widgetEntityId, widgetTitle } from "./names";
import { WidgetPlaceholder } from "./WidgetPlaceholder";

export const lockConfigSchema = z.object({
  title: z.string().default(""),
  entity_id: z.string().min(1, "Entity is required"),
});

/** A lock that never echoes its new state should not hold the pose forever. */
const CONFIRM_TIMEOUT_MS = 4000;

function LockWidget({ config, interactive = true }: WidgetComponentProps) {
  const entityId = widgetEntityId(config);
  const customTitle = widgetTitle(config);
  const lock = useLock(entityId);
  const entities = useEntities();

  if (!entityId) {
    return (
      <WidgetPlaceholder
        title={customTitle || "Lock"}
        message="Pick a lock entity in settings."
      />
    );
  }

  if (!lock) {
    return (
      <WidgetPlaceholder
        title={customTitle || entityId}
        message="Entity unavailable"
        dashed
      />
    );
  }

  const members = boundEntityIds({ entity_id: entityId }, entities[entityId]);
  const tally = tallyEntities(
    entities,
    members,
    (entry) => entry.state === "locked" || entry.state === "locking",
  );
  const groupLabel =
    members.length > 1
      ? formatAllOrFraction(tally.active, tally.total, {
          all: "All locked",
          none: "Unlocked",
          word: "locked",
        })
      : null;

  return (
    <LockCard
      lock={lock}
      customTitle={customTitle}
      interactive={interactive}
      groupLabel={groupLabel}
    />
  );
}

interface LockCardProps {
  lock: UseLockResult;
  customTitle: string;
  interactive: boolean;
  groupLabel: string | null;
}

/**
 * Split from the widget so the pose and its pending tap live behind the checks
 * for a missing or unavailable entity.
 */
function LockCard({ lock, customTitle, interactive, groupLabel }: LockCardProps) {
  const { ref: cardRef, compact, tight, chip } = useCardDensity();
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

  const body = chip ? (
    <ChipFace
      title={displayTitle}
      status={groupLabel ?? visuals.label}
      icon={Lock}
      active={!shownOpen}
    />
  ) : (
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
          {groupLabel ?? visuals.label}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Padlock
          open={shownOpen}
          jammed={visuals.jammed}
          className={cx(
            "h-full w-full",
            tight ? "max-h-20" : compact ? "max-h-28" : "max-h-44",
            "motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
            visuals.glyph,
          )}
        />
      </div>

      {interactive && lock.supportsOpen && !tight ? (
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
      ) : tight ? null : (
        <p className="shrink-0 truncate text-xs text-muted-foreground">
          {footNote}
        </p>
      )}
    </>
  );

  const cardClass = cx(
    chip ? chipShellClass : cardShellClass,
    "text-left text-card-foreground",
    !chip && "border shadow-sm",
    "motion-safe:transition-[background-color,border-color,color] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
    !chip && (compact ? "gap-2 p-4" : "gap-3 p-5"),
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
  defaultSize: { w: 4, h: 1, minW: 2, minH: 1, maxW: 8, maxH: 6 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 8, h: 6 },
  entityDomains: ["lock"],
  capabilities: ["entity.read", "service.call"],
});
