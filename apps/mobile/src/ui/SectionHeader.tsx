import { Text } from "heroui-native";
import { View } from "react-native";

import { isLiveSession, useHaStore } from "@/store/ha-store";
import { useT } from "@/store/locale-store";
import { isActiveState } from "@/store/use-entity";

interface SectionHeaderProps {
  title: string;
  /** Everything under this heading, so the count can follow live state. */
  entityIds: string[];
}

/**
 * A room heading with what is on inside it, so a collapsed glance down the
 * screen tells you where the house is awake without reading every tile.
 */
export function SectionHeader({ title, entityIds }: SectionHeaderProps) {
  const t = useT();

  // A count is a number, so the store's Object.is check keeps this subscribed
  // to the section rather than to every entity update in the house.
  const active = useHaStore((state) => {
    if (!isLiveSession(state.mode, state.status)) return 0;
    let count = 0;
    for (const entityId of entityIds) {
      if (isActiveState(state.entities[entityId])) count += 1;
    }
    return count;
  });

  return (
    <View className="flex-row items-baseline justify-between gap-3 px-1">
      <Text
        numberOfLines={1}
        className="text-foreground flex-1 text-xl font-semibold"
      >
        {title}
      </Text>
      {active > 0 ? (
        <Text className="text-muted text-[13px]">
          {t("home.sectionActive", { count: active })}
        </Text>
      ) : null}
    </View>
  );
}
