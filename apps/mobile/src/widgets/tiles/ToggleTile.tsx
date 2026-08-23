import Ionicons from "@expo/vector-icons/Ionicons";
import { Switch } from "heroui-native";

import { entityDomain } from "@/store/use-entity";
import { useT } from "@/store/locale-store";
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
  const [isOn, setOptimisticOn] = useOptimistic(entity?.state === "on");

  const domain = entityDomain(entityId);

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
          : isOn
            ? t("widget.state.on")
            : t("widget.state.off")
      }
      icon={ICONS[domain] ?? "toggle-outline"}
      size={size}
      active={isOn && !unavailable}
      disabled={unavailable}
      onPress={toggle}
      onLongPress={openEntityDetail}
      accessory={
        <Switch
          isSelected={isOn}
          onSelectedChange={toggle}
          isDisabled={unavailable}
        />
      }
    />
  );
}
