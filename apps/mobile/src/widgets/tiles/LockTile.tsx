import { deriveLock, formatAllOrFraction, type HassEntity } from "@ethio/ha-sdk";

import type { MessageKey } from "@/i18n";
import { useT } from "@/store/locale-store";
import { LockDetailBody } from "@/widgets/detail/LockDetailBody";
import type { WidgetBodyProps } from "@/widgets/types";
import { useGroupTally } from "@/widgets/use-group";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

function isLockedEntity(entity: HassEntity): boolean {
  return entity.state === "locked" || entity.state === "locking";
}

function lockNeedsCode(entity: HassEntity | undefined): boolean {
  const format = entity?.attributes.code_format;
  return format === "number" || format === "text";
}

const STATUS_KEYS: Record<string, MessageKey> = {
  locked: "widget.state.locked",
  unlocked: "widget.state.unlocked",
  locking: "widget.state.locking",
  unlocking: "widget.state.unlocking",
  jammed: "widget.state.jammed",
  open: "widget.state.open",
};

export function LockTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, sheet } = useTile(config);
  const lock = deriveLock(entity);
  const { members, tally } = useGroupTally(config, entity, isLockedEntity);
  const groupStatus =
    members.length > 1
      ? formatAllOrFraction(tally.active, tally.total, {
          all: "All locked",
          none: "Unlocked",
          word: "locked",
        })
      : null;

  const [state, setOptimisticState] = useOptimistic(entity?.state ?? "unknown");
  const isLocked = state === "locked" || state === "locking";
  // A bolt in transit should not accept a second command.
  const busy = state === "locking" || state === "unlocking";
  const next = isLocked ? "unlock" : "lock";

  const openDetail = () => {
    if (!entityId) return;
    sheet.open({
      title,
      body: <LockDetailBody entityId={entityId} />,
    });
  };

  const toggle = () => {
    if (unavailable || busy) return;
    if (next === "unlock" && lockNeedsCode(entity)) {
      openDetail();
      return;
    }
    setOptimisticState(isLocked ? "unlocking" : "locking");
    callService("lock", next, { entity_id: entityId });
  };

  const statusKey = STATUS_KEYS[state];

  return (
    <WidgetTile
      title={title}
      status={
        unavailable
          ? t("widget.state.unavailable")
          : (groupStatus ??
            (statusKey ? t(statusKey) : state))
      }
      icon={
        lock?.isJammed
          ? "warning-outline"
          : isLocked
            ? "lock-closed"
            : "lock-open-outline"
      }
      size={size}
      active={isLocked && !unavailable}
      disabled={unavailable}
      onPress={openDetail}
      onLongPress={openDetail}
      onIconPress={toggle}
      iconLabel={t(isLocked ? "widget.action.unlock" : "widget.action.lock")}
    />
  );
}
