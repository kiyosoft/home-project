import { deriveLock, formatAllOrFraction, type HassEntity } from "@ethio/ha-sdk";

import type { MessageKey } from "@/i18n";
import { useT } from "@/store/locale-store";
import type { WidgetBodyProps } from "@/widgets/types";
import { useGroupTally } from "@/widgets/use-group";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import { WidgetTile } from "@/widgets/WidgetTile";

function isLockedEntity(entity: HassEntity): boolean {
  return entity.state === "locked" || entity.state === "locking";
}

const STATUS_KEYS: Record<string, MessageKey> = {
  locked: "widget.state.locked",
  unlocked: "widget.state.unlocked",
  locking: "widget.state.locking",
  unlocking: "widget.state.unlocking",
  jammed: "widget.state.jammed",
};

export function LockTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, openEntityDetail } = useTile(config);
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

  const toggle = () => {
    if (unavailable || busy) return;
    setOptimisticState(isLocked ? "unlocking" : "locking");
    callService("lock", isLocked ? "unlock" : "lock", { entity_id: entityId });
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
      onPress={openEntityDetail}
      onLongPress={openEntityDetail}
      onIconPress={toggle}
      iconLabel={t("widget.action.lock")}
    />
  );
}
