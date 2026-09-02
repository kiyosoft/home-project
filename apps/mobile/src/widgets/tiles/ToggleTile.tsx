import { formatFraction, isOnState } from "@ethio/ha-sdk";
import Ionicons from "@expo/vector-icons/Ionicons";

import { entityDomain } from "@/store/use-entity";
import { useT } from "@/store/locale-store";
import { useGroupTally } from "@/widgets/use-group";
import { useOptimistic } from "@/widgets/use-optimistic";
import { useCallService } from "@/widgets/use-service";
import { useTile } from "@/widgets/use-tile";
import type { WidgetBodyProps } from "@/widgets/types";
import { WidgetTile } from "@/widgets/WidgetTile";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  switch: "toggle-outline",
  input_boolean: "flag-outline",
  fan: "aperture-outline",
};

export function ToggleTile({ config, size }: WidgetBodyProps) {
  const t = useT();
  const callService = useCallService();
  const { entityId, entity, title, unavailable, openEntityDetail } = useTile(config);
  const { members, tally } = useGroupTally(config, entity, isOnState);
  const grouped = members.length > 1;
  const [isOn, setOptimisticOn] = useOptimistic(
    grouped ? tally.active > 0 : entity?.state === "on",
  );

  const domain = entityDomain(entityId);
  const groupStatus = grouped
    ? formatFraction(tally.active, tally.total, "on")
    : null;

  const toggle = () => {
    if (unavailable) return;
    setOptimisticOn(!isOn);
    callService(domain, isOn ? "turn_off" : "turn_on", { entity_id: entityId });
  };

  return (
    <WidgetTile
      title={title}
      status={
        unavailable
          ? t("widget.state.unavailable")
          : (groupStatus ??
            (isOn ? t("widget.state.on") : t("widget.state.off")))
      }
      icon={ICONS[domain] ?? "toggle-outline"}
      size={size}
      active={isOn && !unavailable}
      disabled={unavailable}
      onPress={openEntityDetail}
      onLongPress={openEntityDetail}
      onIconPress={toggle}
      iconLabel={t("widget.action.power")}
    />
  );
}
